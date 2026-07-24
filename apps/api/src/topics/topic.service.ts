import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import { ProviderRegistry } from "../ai/providers/provider.registry";
import type { TenantContext } from "../tenancy/tenancy.service";
import { TopicRepository } from "./topic.repository";
import { buildTopicMessages, TOPIC_MAX_TOKENS } from "./topic.prompt";
import type { DiscoverTopicsDto } from "./dto/topic.dto";

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function strArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function objArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v),
  );
}

const MOMENTUM = new Set(["rising", "peaking", "steady", "fading"]);

@Injectable()
export class TopicService {
  private readonly logger = new Logger(TopicService.name);

  constructor(
    private readonly repository: TopicRepository,
    private readonly router: AiRouterService,
    private readonly registry: ProviderRegistry,
  ) {}

  /** Whether any configured provider can actually search the web. */
  searchAvailable(): boolean {
    return this.registry
      .all()
      .some((p) => p.isConfigured() && p.supportsWebSearch?.() === true);
  }

  async discover(tenant: TenantContext, dto: DiscoverTopicsDto) {
    if (!this.searchAvailable()) {
      // Answering from model recall and calling it trending would be a lie the
      // user cannot detect, so the feature refuses rather than degrades.
      throw new ServiceUnavailableException({
        code: "SEARCH_UNAVAILABLE",
        message:
          "Topic discovery needs a provider with web search. Add an Anthropic API key to enable it.",
      });
    }

    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);
    const avoidRecent = await this.repository.recentTitles(project.id);

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "research",
      messages: buildTopicMessages({
        niche: dto.niche,
        audience: dto.audience ?? project.audience,
        country: dto.country,
        podcastName: project.podcast_name,
        avoidRecent,
        language: project.language,
      }),
      projectId: project.id,
      jsonMode: true,
      webSearch: true,
      maxTokens: TOPIC_MAX_TOKENS,
      temperature: 0.6,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;
    if (!parsed) {
      throw new ServiceUnavailableException({
        code: "AI_UNAVAILABLE",
        message: "The model did not return usable topics. Please try again.",
      });
    }

    const topics = objArray(parsed.topics)
      .map((t) => ({
        title: str(t.title) ?? "",
        angle: str(t.angle),
        why_now: str(t.why_now),
        audience_fit: str(t.audience_fit),
        // Only the documented values; anything else is dropped rather than
        // shown to the user as a confident-looking label.
        momentum: MOMENTUM.has(String(t.momentum ?? "").toLowerCase())
          ? String(t.momentum).toLowerCase()
          : null,
        search_terms: strArray(t.search_terms),
        sources: objArray(t.sources).filter((s) => str(s.url) ?? str(s.title)),
      }))
      // A topic with no source is exactly what this feature exists to avoid.
      .filter((t) => t.title && t.sources.length > 0);

    if (topics.length === 0) {
      throw new ServiceUnavailableException({
        code: "NO_SOURCED_TOPICS",
        message:
          "No topics came back with a source behind them. Try a broader niche, or run it again.",
      });
    }

    const discoveryId = await this.repository.save(
      tenant,
      {
        projectId: project.id,
        niche: dto.niche,
        audience: dto.audience ?? project.audience ?? null,
        country: dto.country ?? null,
        provider: routed.provider,
        model: routed.model,
        metadata: {
          summary: str(parsed.summary),
          gaps: strArray(parsed.gaps),
          avoid: strArray(parsed.avoid),
          dropped_unsourced: objArray(parsed.topics).length - topics.length,
        },
      },
      topics,
    );

    this.logger.log({
      discovery: discoveryId,
      topics: topics.length,
      provider: routed.provider,
      credits: routed.creditsSpent,
    });

    return this.repository.findOne(tenant, discoveryId);
  }

  list(tenant: TenantContext, projectId?: string) {
    return this.repository.list(tenant, projectId).then((items) => ({ items }));
  }

  findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  setSaved(tenant: TenantContext, topicId: string, isSaved: boolean) {
    return this.repository.setSaved(tenant, topicId, isSaved);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
