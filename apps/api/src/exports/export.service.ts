import { Injectable, Logger } from "@nestjs/common";
import { ScriptRepository } from "../scripts/script.repository";
import { OutlineRepository } from "../outlines/outline.repository";
import { ResearchRepository } from "../research/research.repository";
import type { TenantContext } from "../tenancy/tenancy.service";
import { SeoRepository } from "../seo/seo.repository";
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
    private readonly seo: SeoRepository,
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
        language: script.language,
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
        language: outline.language,
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
        language: session.language,
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
   * SEO metadata as a document.
   *
   * Publishing an episode means pasting this into a podcast host or YouTube,
   * so the export leads with the chosen title and description — the two things
   * that actually get pasted — and keeps the alternates below as reference
   * rather than burying the decision among them.
   */
  async exportSeo(tenant: TenantContext, id: string, format: ExportFormat, language?: string) {
    const set = await this.seo.findOne(tenant, id);

    const chosenTitle = set.titles.find((t) => t.selected) ?? set.titles[0];
    const chosenDescription = set.descriptions.find((d) => d.selected) ?? set.descriptions[0];

    const facts: ExportDocument["facts"] = [];
    if (set.target_keyword) facts.push({ label: "Target keyword", value: set.target_keyword });
    if (set.search_intent) facts.push({ label: "Intent", value: set.search_intent });
    if (set.score !== null) facts.push({ label: "Score", value: String(set.score) });

    const sections: ExportDocument["sections"] = [];
    if (chosenTitle) {
      sections.push({ title: "Title", content: chosenTitle.title });
    }
    if (chosenDescription) {
      sections.push({ title: "Description", content: chosenDescription.description });
    }
    if (set.chapters.length) {
      sections.push({
        title: "Chapters",
        content: "",
        bullets: set.chapters.map(
          (c) => `${formatTimestamp(c.timestamp_seconds)} ${c.title}`,
        ),
      });
    }

    const lists: ExportDocument["lists"] = [];
    if (set.keywords.length) {
      lists.push({
        heading: "Keywords",
        items: set.keywords.map((k) =>
          k.priority ? `${k.keyword} (priority ${k.priority})` : k.keyword,
        ),
      });
    }
    if (set.tags.length) lists.push({ heading: "Tags", items: [set.tags.map((t) => t.tag).join(", ")] });
    if (set.hashtags.length) {
      lists.push({ heading: "Hashtags", items: [set.hashtags.map((h) => h.hashtag).join(" ")] });
    }
    // Alternates last: useful to have, but not what gets pasted.
    const otherTitles = set.titles.filter((t) => t.id !== chosenTitle?.id);
    if (otherTitles.length) {
      lists.push({ heading: "Other titles", items: otherTitles.map((t) => t.title) });
    }
    const otherDescriptions = set.descriptions.filter((d) => d.id !== chosenDescription?.id);
    if (otherDescriptions.length) {
      lists.push({
        heading: "Other descriptions",
        items: otherDescriptions.map((d) => d.description),
      });
    }

    return this.finish(
      {
        kind: "seo",
        language: set.target_language,
        title: chosenTitle?.title ?? set.title,
        subtitle: chosenDescription?.description ?? null,
        facts,
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
      // Named from the document as exported, so the filename is in the same
      // language as the contents. Naming an English export with its Urdu
      // title looked consistent in the abstract and read as a mistake in a
      // downloads folder.
      filename: filenameFor(document.title, format, language),
      mime: FORMAT_META[format].mime,
      content,
      creditsSpent,
    };
  }
}

/** mm:ss for chapter marks; hosts expect this exact shape. */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}
