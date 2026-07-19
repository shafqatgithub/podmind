import { Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { ResearchRepository } from "./research.repository";
import {
  buildResearchMessages,
  DEPTH_MAX_TOKENS,
  type ResearchDepth,
} from "./research.prompt";
import type { CreateResearchDto, ListResearchQueryDto } from "./dto/research.dto";

/** Shape the model is asked to return; every field is optional defensively. */
interface RawResearch {
  title?: unknown;
  summary?: unknown;
  key_points?: unknown;
  statistics?: unknown;
  timeline?: unknown;
  case_studies?: unknown;
  expert_opinions?: unknown;
  myths?: unknown;
  arguments?: unknown;
  counter_arguments?: unknown;
  discussion_ideas?: unknown;
  follow_up_questions?: unknown;
  related_topics?: unknown;
  uncertainties?: unknown;
  sources?: unknown;
  confidence_score?: unknown;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v),
  );
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

/** Credibility words to a sortable score; unknown values stay null. */
function credibilityToScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.min(Math.max(value, 0), 1);
  if (typeof value !== "string") return null;
  const map: Record<string, number> = { high: 0.9, medium: 0.6, low: 0.3 };
  return map[value.toLowerCase()] ?? null;
}

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly repository: ResearchRepository,
    private readonly router: AiRouterService,
  ) {}

  /**
   * Run a research session end to end:
   * validate the project is in the tenant → create the session → route the
   * prompt through the AI Router (which meters credits and handles fallback)
   * → parse the structured output → persist result, sources and follow-up
   * questions atomically.
   */
  async create(tenant: TenantContext, dto: CreateResearchDto) {
    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);
    const depth = (dto.depth ?? "standard") as ResearchDepth;

    const session = await this.repository.createSession(tenant, {
      projectId: project.id,
      title: dto.title?.trim() || dto.topic.slice(0, 200),
      topic: dto.topic,
      objective: dto.objective ?? null,
      depth,
    });

    const messages = buildResearchMessages({
      topic: dto.topic,
      objective: dto.objective,
      depth,
      podcastName: project.podcast_name,
      audience: project.audience,
      niche: project.niche,
      language: project.language,
    });

    const startedAt = Date.now();
    let routed;
    try {
      routed = await this.router.route({
        organizationId: tenant.organizationId,
        task: "research",
        messages,
        projectId: project.id,
        jsonMode: true,
        maxTokens: DEPTH_MAX_TOKENS[depth],
        temperature: 0.4,
      });
    } catch (err) {
      // Do not leave an empty session behind; credits are already refunded
      // by the Router when every provider failed.
      await this.repository.markSessionFailed(
        session.id,
        err instanceof Error ? err.message : "AI request failed",
      );
      throw err;
    }

    const parsed = BaseHttpProvider.extractJson(routed.text) as RawResearch | null;
    if (!parsed) {
      // The model returned prose instead of JSON. Keep the text rather than
      // discarding work the user paid for.
      this.logger.warn({ session: session.id }, "research output was not valid JSON");
      const result = await this.repository.saveResult({
        sessionId: session.id,
        aiProvider: routed.provider,
        result: {
          title: session.title,
          summary: null,
          content: routed.text,
          confidenceScore: null,
          tokenUsage: routed.promptTokens + routed.completionTokens,
          processingTimeMs: Date.now() - startedAt,
          metadata: { unstructured: true, model: routed.model },
        },
        sources: [],
        followUpQuestions: [],
      });
      return this.assemble(session, [result], routed);
    }

    const sources = asObjectArray(parsed.sources).map((s) => ({
      title: asString(s.title),
      url: asString(s.url),
      author: asString(s.author),
      sourceType: asString(s.source_type),
      credibility: credibilityToScore(s.credibility),
    }));

    const confidence =
      typeof parsed.confidence_score === "number" && Number.isFinite(parsed.confidence_score)
        ? Math.min(Math.max(parsed.confidence_score, 0), 1)
        : null;

    // The structured body lives in metadata; `content` keeps a readable
    // Markdown rendering so exports and the UI never need the raw JSON.
    const metadata = {
      model: routed.model,
      provider: routed.provider,
      depth,
      key_points: asStringArray(parsed.key_points),
      statistics: asObjectArray(parsed.statistics),
      timeline: asObjectArray(parsed.timeline),
      case_studies: asObjectArray(parsed.case_studies),
      expert_opinions: asObjectArray(parsed.expert_opinions),
      myths: asObjectArray(parsed.myths),
      arguments: asStringArray(parsed.arguments),
      counter_arguments: asStringArray(parsed.counter_arguments),
      discussion_ideas: asStringArray(parsed.discussion_ideas),
      related_topics: asStringArray(parsed.related_topics),
      uncertainties: asStringArray(parsed.uncertainties),
    };

    const result = await this.repository.saveResult({
      sessionId: session.id,
      aiProvider: routed.provider,
      result: {
        title: asString(parsed.title) ?? session.title,
        summary: asString(parsed.summary),
        content: renderMarkdown(metadata, asString(parsed.summary), sources),
        confidenceScore: confidence,
        tokenUsage: routed.promptTokens + routed.completionTokens,
        processingTimeMs: Date.now() - startedAt,
        metadata,
      },
      sources,
      followUpQuestions: asStringArray(parsed.follow_up_questions).slice(0, 12),
    });

    this.logger.log({
      session: session.id,
      provider: routed.provider,
      model: routed.model,
      depth,
      sources: sources.length,
      credits: routed.creditsSpent,
    });

    return this.assemble(session, [result], routed);
  }

  async list(tenant: TenantContext, query: ListResearchQueryDto) {
    const page = await this.repository.list(tenant, query);
    return { items: page.items, next_cursor: page.nextCursor, has_more: page.hasMore };
  }

  /** Full session detail: results with their sources, plus follow-up questions. */
  async findOne(tenant: TenantContext, id: string) {
    const session = await this.repository.findSession(tenant, id);
    const results = await this.repository.findResults(id);
    const sources = await this.repository.findSources(results.map((r) => r.id));
    const questions = await this.repository.findQuestions(id);

    return {
      ...session,
      results: results.map((r) => ({
        ...r,
        confidence_score: r.confidence_score === null ? null : Number(r.confidence_score),
        sources: (sources.get(r.id) ?? []).map((s) => ({
          ...s,
          credibility_score:
            s.credibility_score === null ? null : Number(s.credibility_score),
        })),
      })),
      questions,
    };
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.softDelete(tenant, id);
    return { deleted: true };
  }

  private assemble(
    session: { id: string; title: string; topic: string; depth: string },
    results: unknown[],
    routed: { provider: string; model: string; creditsSpent: number; latencyMs: number },
  ) {
    return {
      ...session,
      results,
      provider: routed.provider,
      model: routed.model,
      credits_spent: routed.creditsSpent,
      latency_ms: routed.latencyMs,
    };
  }
}

/* ------------------------------------------------------------------ */

/** Human-readable Markdown rendering of the structured research. */
function renderMarkdown(
  meta: Record<string, unknown>,
  summary: string | null,
  sources: { title: string | null; url: string | null }[],
): string {
  const out: string[] = [];
  const list = (heading: string, items: unknown) => {
    const values = Array.isArray(items) ? items : [];
    if (values.length === 0) return;
    out.push(`## ${heading}`);
    for (const item of values) {
      if (typeof item === "string") out.push(`- ${item}`);
      else if (item && typeof item === "object") {
        const values2 = Object.values(item as Record<string, unknown>)
          .filter((v) => typeof v === "string" && v.trim())
          .join(" — ");
        if (values2) out.push(`- ${values2}`);
      }
    }
    out.push("");
  };

  if (summary) out.push("## Summary", summary, "");
  list("Key Points", meta.key_points);
  list("Statistics", meta.statistics);
  list("Timeline", meta.timeline);
  list("Case Studies", meta.case_studies);
  list("Expert Opinions", meta.expert_opinions);
  list("Myths vs Reality", meta.myths);
  list("Arguments", meta.arguments);
  list("Counter Arguments", meta.counter_arguments);
  list("Discussion Ideas", meta.discussion_ideas);
  list("Related Topics", meta.related_topics);
  list("Uncertainties", meta.uncertainties);

  if (sources.length) {
    out.push("## Sources");
    for (const source of sources) {
      out.push(source.url ? `- [${source.title ?? source.url}](${source.url})` : `- ${source.title ?? ""}`);
    }
  }
  return out.join("\n").trim();
}
