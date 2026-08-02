import { Injectable, Logger } from "@nestjs/common";
import { ScriptRepository } from "../scripts/script.repository";
import { OutlineRepository } from "../outlines/outline.repository";
import { ResearchRepository } from "../research/research.repository";
import type { TenantContext } from "../tenancy/tenancy.service";
import { ExportTranslator } from "./export.translator";
import {
  filenameFor,
  FORMAT_META,
  render,
  type ExportDocument,
  type ExportFormat,
} from "./export.renderers";

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * Export Center.
 *
 * Each source is mapped into one neutral ExportDocument shape, so a new
 * format needs one renderer rather than one renderer per source, and every
 * source gains new formats at once.
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly scripts: ScriptRepository,
    private readonly outlines: OutlineRepository,
    private readonly research: ResearchRepository,
    private readonly translator: ExportTranslator,
  ) {}

  async exportScript(tenant: TenantContext, id: string, format: ExportFormat, language?: string) {
    const script = await this.scripts.findOne(tenant, id);
    const meta = (script.metadata ?? {}) as Record<string, unknown>;

    const facts = [
      { label: "Style", value: script.script_style },
      { label: "Tone", value: script.tone },
    ];
    if (script.estimated_duration_minutes) {
      facts.push({ label: "Length", value: `${script.estimated_duration_minutes} min` });
    }
    if (script.word_count) {
      facts.push({ label: "Words", value: script.word_count.toLocaleString() });
    }

    const lists: ExportDocument["lists"] = [];
    const verify = asStringArray(meta.verify);
    if (verify.length) lists.push({ heading: "Verify before recording", items: verify });
    const editing = asStringArray(meta.editing_notes);
    if (editing.length) lists.push({ heading: "Editing notes", items: editing });

    return this.finish(
      {
        kind: "script",
        title: script.title,
        subtitle: script.description,
        facts,
        sections: script.sections.map((s) => ({
          title: s.title,
          speaker: s.speaker,
          content: s.content,
          notes: s.notes,
          durationSeconds: s.duration_seconds,
        })),
        lists,
      },
      format,
      tenant,
      language,
    );
  }

  async exportOutline(tenant: TenantContext, id: string, format: ExportFormat, language?: string) {
    const outline = await this.outlines.findOne(tenant, id);
    const meta = (outline.metadata ?? {}) as Record<string, unknown>;

    const facts = [{ label: "Style", value: outline.outline_type }];
    if (outline.estimated_duration_minutes) {
      facts.push({ label: "Length", value: `${outline.estimated_duration_minutes} min` });
    }
    facts.push({ label: "Version", value: String(outline.version) });

    const intro: ExportDocument["intro"] = [];
    const hook = asString(meta.hook);
    if (hook) intro.push({ heading: "Opening hook", body: hook });

    const lists: ExportDocument["lists"] = [];
    const cta = asString(meta.call_to_action);
    if (cta) lists.push({ heading: "Call to action", items: [cta] });
    const closing = asString(meta.closing);
    if (closing) lists.push({ heading: "Closing", items: [closing] });
    if (outline.questions.length) {
      lists.push({
        heading: "Questions to ask",
        items: outline.questions.map((q) => q.question),
      });
    }

    return this.finish(
      {
        kind: "outline",
        title: outline.title,
        subtitle: outline.description,
        facts,
        intro,
        sections: outline.sections.map((s) => ({
          title: s.title,
          content: s.description ?? "",
          bullets: asStringArray(s.talking_points),
          notes: asString((s.metadata as Record<string, unknown> | null)?.transition),
          durationSeconds: s.estimated_minutes ? s.estimated_minutes * 60 : null,
        })),
        lists,
      },
      format,
      tenant,
      language,
    );
  }

  async exportResearch(tenant: TenantContext, id: string, format: ExportFormat, language?: string) {
    const session = await this.research.findSession(tenant, id);
    const results = await this.research.findResults(id);
    const sources = await this.research.findSources(results.map((r) => r.id));
    const questions = await this.research.findQuestions(id);

    const result = results[0];
    const meta = (result?.metadata ?? {}) as Record<string, unknown>;

    const facts = [{ label: "Depth", value: session.depth }];
    if (result?.confidence_score !== null && result?.confidence_score !== undefined) {
      facts.push({
        label: "Confidence",
        value: `${Math.round(Number(result.confidence_score) * 100)}%`,
      });
    }

    const sections: ExportDocument["sections"] = [];
    const named: [string, unknown][] = [
      ["Key points", meta.key_points],
      ["Arguments", meta.arguments],
      ["Counter arguments", meta.counter_arguments],
      ["Discussion ideas", meta.discussion_ideas],
      ["Uncertainties", meta.uncertainties],
    ];
    for (const [heading, value] of named) {
      const items = asStringArray(value);
      if (items.length) sections.push({ title: heading, content: "", bullets: items });
    }

    const lists: ExportDocument["lists"] = [];
    if (questions.length) {
      lists.push({ heading: "Follow-up questions", items: questions.map((q) => q.question) });
    }
    const allSources = [...sources.values()].flat();
    if (allSources.length) {
      lists.push({
        heading: "Sources",
        items: allSources.map((s) =>
          [s.title, s.author, s.url].filter(Boolean).join(" — "),
        ),
      });
    }

    return this.finish(
      {
        kind: "research",
        title: result?.title ?? session.title,
        subtitle: session.topic,
        facts,
        intro: result?.summary ? [{ heading: "Summary", body: result.summary }] : [],
        sections,
        lists,
      },
      format,
      tenant,
      language,
    );
  }

  /**
   * Translate if asked, then render.
   *
   * Translation sits here rather than in each export method so every source
   * gains it at once and none can forget it — the same reason the renderers
   * share one document shape.
   */
  private async finish(
    doc: ExportDocument,
    format: ExportFormat,
    tenant: TenantContext,
    language?: string,
  ) {
    let document = doc;
    let creditsSpent = 0;

    if (language) {
      const translated = await this.translator.translate(doc, language, tenant.organizationId);
      document = translated.doc;
      creditsSpent = translated.creditsSpent;
    }

    const content = render(document, format);
    this.logger.log({ kind: doc.kind, format, language: language ?? null, bytes: content.length });
    return {
      // Named from the original title, not the translated one: the file is
      // still "the fitness episode", and a user scanning downloads should
      // recognise it without first reading the language they exported into.
      filename: filenameFor(doc.title, format, language),
      mime: FORMAT_META[format].mime,
      content,
      creditsSpent,
    };
  }
}
