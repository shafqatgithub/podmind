import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { SeoRepository, type SeoBundle } from "./seo.repository";
import { buildSeoMessages, SEO_MAX_TOKENS } from "./seo.prompt";
import type { CreateSeoDto, SelectSeoDto } from "./dto/seo.dto";

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()) : [];
}
function objArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v)
    ? v.filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x))
    : [];
}
/** Model scores are advisory, so clamp rather than trust. */
function score(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(Math.max(Math.round(v), 0), 100)
    : null;
}

const INTENTS = new Set(["informational", "navigational", "commercial", "transactional"]);

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(
    private readonly repository: SeoRepository,
    private readonly router: AiRouterService,
  ) {}

  async create(tenant: TenantContext, dto: CreateSeoDto) {
    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);

    let sourceText: string | null = null;
    if (dto.script_id) {
      sourceText = await this.repository.findScriptText(project.id, dto.script_id);
    }

    // Without a script or a topic there is nothing to describe.
    const topic = dto.topic?.trim() || project.title;
    if (!topic && !sourceText) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Provide a topic or a script to generate SEO metadata from",
      });
    }

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "seo",
      messages: buildSeoMessages({
        topic,
        sourceText,
        podcastName: project.podcast_name,
        audience: project.audience,
        niche: project.niche,
        targetKeyword: dto.target_keyword,
        language: project.language,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: SEO_MAX_TOKENS,
      temperature: 0.6,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;
    if (!parsed) {
      throw new BadRequestException({
        code: "AI_INVALID_OUTPUT",
        message: "The model did not return usable SEO metadata. Please try again.",
      });
    }

    const titles = objArray(parsed.titles)
      .map((t) => ({
        title: str(t.title) ?? "",
        seoScore: score(t.seo_score),
        clickScore: score(t.click_score),
      }))
      .filter((t) => t.title);

    const descriptions = objArray(parsed.descriptions)
      .map((d) => ({ description: str(d.description) ?? "", seoScore: score(d.seo_score) }))
      .filter((d) => d.description);

    const keywords = objArray(parsed.keywords)
      .map((k) => {
        const intent = str(k.intent)?.toLowerCase() ?? null;
        return {
          keyword: str(k.keyword) ?? "",
          intent: intent && INTENTS.has(intent) ? intent : null,
          priority:
            typeof k.priority === "number" && Number.isFinite(k.priority)
              ? Math.min(Math.max(Math.round(k.priority), 1), 5)
              : null,
        };
      })
      .filter((k) => k.keyword);

    const chapters = objArray(parsed.chapters)
      .map((c) => ({
        title: str(c.title) ?? "",
        timestampSeconds:
          typeof c.timestamp_seconds === "number" && Number.isFinite(c.timestamp_seconds)
            ? Math.max(Math.round(c.timestamp_seconds), 0)
            : 0,
      }))
      .filter((c) => c.title);

    // Hashtags are normalised here rather than trusting the model's format.
    const hashtags = strArray(parsed.hashtags).map((h) =>
      h.startsWith("#") ? h.replace(/\s+/g, "") : `#${h.replace(/\s+/g, "")}`,
    );

    const bundle: SeoBundle = {
      titles,
      descriptions,
      keywords,
      tags: strArray(parsed.tags).map((t) => t.toLowerCase()),
      hashtags,
      chapters,
    };

    const searchIntent = str(parsed.search_intent)?.toLowerCase() ?? null;
    const headScore = titles.length
      ? Math.round(
          titles.reduce((sum, t) => sum + (t.seoScore ?? 0), 0) / titles.length,
        )
      : null;

    const seoId = await this.repository.save(
      tenant,
      {
        projectId: project.id,
        scriptId: dto.script_id ?? null,
        title: topic.slice(0, 200),
        targetKeyword: str(parsed.target_keyword) ?? dto.target_keyword ?? null,
        secondaryKeywords: keywords.map((k) => k.keyword),
        searchIntent: searchIntent && INTENTS.has(searchIntent) ? searchIntent : null,
        targetCountry: dto.target_country ?? null,
        targetLanguage: project.language,
        score: headScore,
        metadata: {
          provider: routed.provider,
          model: routed.model,
          thumbnail_ideas: strArray(parsed.thumbnail_ideas),
          ctr_suggestions: strArray(parsed.ctr_suggestions),
        },
      },
      bundle,
    );

    this.logger.log({
      seo: seoId,
      provider: routed.provider,
      titles: titles.length,
      credits: routed.creditsSpent,
    });

    return this.repository.findOne(tenant, seoId);
  }

  async list(tenant: TenantContext, projectId?: string) {
    return { items: await this.repository.list(tenant, projectId) };
  }

  findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  select(tenant: TenantContext, id: string, dto: SelectSeoDto) {
    return this.repository.select(tenant, id, dto.title_id, dto.description_id);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
