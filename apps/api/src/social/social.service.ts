import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { SocialRepository, type SocialPostInput } from "./social.repository";
import {
  buildSocialMessages, PLATFORM_RULES, SOCIAL_MAX_TOKENS, type SocialPlatform,
} from "./social.prompt";
import type { CreateSocialDto } from "./dto/social.dto";

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

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  constructor(
    private readonly repository: SocialRepository,
    private readonly router: AiRouterService,
  ) {}

  async create(tenant: TenantContext, dto: CreateSocialDto) {
    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);

    let sourceText: string | null = null;
    if (dto.script_id) {
      sourceText = await this.repository.findScriptText(project.id, dto.script_id);
    }

    const topic = dto.topic?.trim() || project.title;
    if (!topic && !sourceText) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Provide a topic or a script to write posts about",
      });
    }

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "social",
      messages: buildSocialMessages({
        topic,
        sourceText,
        platforms: dto.platforms,
        tone: dto.tone ?? "friendly",
        podcastName: project.podcast_name,
        audience: project.audience,
        language: project.language,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: SOCIAL_MAX_TOKENS,
      temperature: 0.8,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;
    if (!parsed) {
      throw new BadRequestException({
        code: "AI_INVALID_OUTPUT",
        message: "The model did not return usable posts. Please try again.",
      });
    }

    const requested = new Set<string>(dto.platforms);
    const posts: SocialPostInput[] = [];

    for (const raw of objArray(parsed.posts)) {
      const platform = str(raw.platform)?.toLowerCase();
      const content = str(raw.content);
      // Ignore platforms the user did not ask for, and empty posts.
      if (!platform || !requested.has(platform) || !content) continue;

      const limit = PLATFORM_RULES[platform as SocialPlatform].limit;
      posts.push({
        platform,
        title: str(raw.title),
        // Enforce the limit ourselves; a model that overshoots would
        // otherwise produce a post the platform silently rejects.
        content: content.length > limit ? `${content.slice(0, limit - 1).trimEnd()}…` : content,
        hashtags: strArray(raw.hashtags).map((h) =>
          h.startsWith("#") ? h.replace(/\s+/g, "") : `#${h.replace(/\s+/g, "")}`,
        ),
        cta: str(raw.cta),
      });
    }

    if (posts.length === 0) {
      throw new BadRequestException({
        code: "AI_INVALID_OUTPUT",
        message: "The model returned no usable posts. Please try again.",
      });
    }

    const campaignId = await this.repository.save(
      tenant,
      {
        projectId: project.id,
        scriptId: dto.script_id ?? null,
        title: topic.slice(0, 200),
        description: `Posts for ${posts.map((p) => p.platform).join(", ")}`,
        metadata: {
          provider: routed.provider,
          model: routed.model,
          tone: dto.tone ?? "friendly",
          thread: strArray(parsed.thread),
          carousel_ideas: strArray(parsed.carousel_ideas),
          emoji_notes: strArray(parsed.emoji_notes),
        },
      },
      posts,
    );

    this.logger.log({
      campaign: campaignId,
      provider: routed.provider,
      posts: posts.length,
      credits: routed.creditsSpent,
    });

    return this.repository.findOne(tenant, campaignId);
  }

  async list(tenant: TenantContext, projectId?: string) {
    return { items: await this.repository.list(tenant, projectId) };
  }

  findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
