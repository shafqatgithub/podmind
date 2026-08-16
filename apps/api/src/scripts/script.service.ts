import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { ScriptRepository } from "./script.repository";
import {
  buildScriptMessages,
  countWords,
  readabilityScore,
  SCRIPT_MAX_TOKENS,
  WORDS_PER_MINUTE,
  type ScriptStyle,
  type ScriptTone,
} from "./script.prompt";
import type { CreateScriptDto } from "./dto/script.dto";
import { KnowledgeService } from "../knowledge/knowledge.service";
import { renderKnowledgeContext } from "../knowledge/knowledge.prompt";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

const SPEAKERS = new Set(["host", "guest", "both"]);

@Injectable()
export class ScriptService {
  private readonly logger = new Logger(ScriptService.name);

  constructor(
    private readonly repository: ScriptRepository,
    private readonly router: AiRouterService,
      private readonly knowledge: KnowledgeService,
  ) {}

  async create(tenant: TenantContext, dto: CreateScriptDto) {
    const project = await this.repository.findProjectInTenant(tenant, dto.project_id);

    // Writing from an outline is the documented path; a bare topic is the
    // fallback. One of the two must be present or there is nothing to write.
    let outlineContext: Parameters<typeof buildScriptMessages>[0]["outline"] = null;
    let topic = dto.topic?.trim() ?? "";
    let style = (dto.style ?? "solo") as ScriptStyle;
    let outlineLanguage: string | null = null;

    if (dto.outline_id) {
      const outline = await this.repository.findOutlineForScript(tenant, dto.outline_id);
      const meta = (outline.metadata ?? {}) as Record<string, unknown>;
      outlineContext = {
        title: outline.title,
        hook: asString(meta.hook),
        callToAction: asString(meta.call_to_action),
        closing: asString(meta.closing),
        sections: outline.sections.map((s) => ({
          title: s.title,
          description: s.description,
          estimatedMinutes: s.estimated_minutes,
          talkingPoints: asStringArray(s.talking_points),
        })),
      };
      if (!topic) topic = outline.title;
      // The outline already decided the format; honour it unless overridden.
      if (!dto.style) style = outline.outline_type as ScriptStyle;
      outlineLanguage = outline.language;
    }

    if (!topic) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Provide a topic or an outline to write from",
      });
    }

    const tone = (dto.tone ?? "friendly") as ScriptTone;
    const duration = dto.duration_minutes ?? 30;

    /**
     * Explicit request first, then the outline being written from, then the
     * project. Skipping the middle step told the model to write English from
     * an Urdu outline, and it produced a script that was half each.
     */
    const language = dto.language ?? outlineLanguage ?? project.language;

    // The host's own documents, when they have any.
    const scriptKnowledge = renderKnowledgeContext(
      await this.knowledge.retrieveForContext(tenant, project.id, topic, 6),
    );

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "script",
      messages: buildScriptMessages({
        knowledge: scriptKnowledge,
        topic,
        style,
        tone,
        durationMinutes: duration,
        podcastName: project.podcast_name,
        audience: project.audience,
        language,
        guestName: dto.guest_name ?? null,
        outline: outlineContext,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: SCRIPT_MAX_TOKENS,
      temperature: 0.7,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;

    const sections = parsed
      ? (Array.isArray(parsed.sections) ? parsed.sections : [])
          .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
          .map((section) => {
            const content = asString(section.content) ?? "";
            const speaker = asString(section.speaker)?.toLowerCase() ?? null;
            const declared =
              typeof section.duration_seconds === "number" &&
              Number.isFinite(section.duration_seconds)
                ? Math.round(section.duration_seconds)
                : null;
            return {
              title: asString(section.title),
              speaker: speaker && SPEAKERS.has(speaker) ? speaker : "host",
              content,
              notes: asString(section.notes),
              // Trust the words over the model's own estimate: the text is
              // what will actually be read aloud.
              durationSeconds:
                content.length > 0
                  ? Math.round((countWords(content) / WORDS_PER_MINUTE) * 60)
                  : declared,
            };
          })
          .filter((s) => s.content.length > 0)
      : [];

    // Plain-text script: what a host prints and reads from.
    const content =
      sections.length > 0
        ? sections
            .map((s) =>
              [
                s.title ? `## ${s.title}` : null,
                s.speaker && s.speaker !== "host" ? `[${s.speaker.toUpperCase()}]` : null,
                s.content,
                s.notes ? `> ${s.notes}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            )
            .join("\n\n")
        : routed.text;

    const wordCount = countWords(content);
    const estimatedMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

    const script = await this.repository.saveScript({
      tenant,
      projectId: project.id,
      outlineId: dto.outline_id ?? null,
      title: (parsed ? asString(parsed.title) : null) ?? topic.slice(0, 200),
      description: parsed ? asString(parsed.summary) : null,
      style,
      tone,
      language,
      provider: routed.provider,
      content,
      wordCount,
      estimatedMinutes,
      metadata: {
        model: routed.model,
        provider: routed.provider,
        target_minutes: duration,
        readability: readabilityScore(content),
        editing_notes: parsed ? asStringArray(parsed.editing_notes) : [],
        // Claims the model was not confident about, surfaced rather than
        // buried: an unverified statistic read on air is a real cost.
        verify: parsed ? asStringArray(parsed.verify) : [],
        unstructured: !parsed || sections.length === 0,
      },
      sections:
        sections.length > 0
          ? sections
          : [
              {
                title: null,
                speaker: "host",
                content: routed.text,
                notes: null,
                durationSeconds: null,
              },
            ],
    });

    this.logger.log({
      script: script.id,
      words: wordCount,
      minutes: estimatedMinutes,
      sections: sections.length,
      credits: routed.creditsSpent,
    });

    return {
      ...script,
      provider: routed.provider,
      model: routed.model,
      credits_spent: routed.creditsSpent,
    };
  }

  async list(tenant: TenantContext, projectId?: string) {
    return { items: await this.repository.list(tenant, projectId) };
  }

  async findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
