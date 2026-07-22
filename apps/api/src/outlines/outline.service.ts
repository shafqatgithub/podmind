import { Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { OutlineRepository } from "./outline.repository";
import {
  buildOutlineMessages,
  OUTLINE_MAX_TOKENS,
  type OutlineStyle,
} from "./outline.prompt";
import type { CreateOutlineDto } from "./dto/outline.dto";

interface RawSection {
  title?: unknown;
  description?: unknown;
  estimated_minutes?: unknown;
  talking_points?: unknown;
  transition?: unknown;
}

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

const asMinutes = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;

@Injectable()
export class OutlineService {
  private readonly logger = new Logger(OutlineService.name);

  constructor(
    private readonly repository: OutlineRepository,
    private readonly router: AiRouterService,
  ) {}

  async create(tenant: TenantContext, dto: CreateOutlineDto) {
    const project = await this.repository.findProjectInTenant(tenant, dto.project_id);
    const style = (dto.style ?? "solo") as OutlineStyle;
    const duration = dto.duration_minutes ?? 30;

    // Build on prior research when the caller points at a session.
    let researchSummary: string | null = null;
    let researchKeyPoints: string[] = [];
    if (dto.research_session_id) {
      const research = await this.repository.findResearchForOutline(
        tenant,
        dto.research_session_id,
      );
      researchSummary = research.summary;
      researchKeyPoints = asStringArray(
        (research.metadata as Record<string, unknown> | null)?.key_points,
      ).slice(0, 12);
    }

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "outline",
      messages: buildOutlineMessages({
        topic: dto.topic,
        style,
        durationMinutes: duration,
        podcastName: project.podcast_name,
        audience: project.audience,
        niche: project.niche,
        language: project.language,
        researchSummary,
        researchKeyPoints,
        guestName: dto.guest_name ?? null,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: OUTLINE_MAX_TOKENS,
      temperature: 0.6,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;
    if (!parsed) {
      this.logger.warn({ project: project.id }, "outline output was not valid JSON");
      // Keep the work: store it as a single section rather than discard a
      // generation the user paid for.
      const outline = await this.repository.saveOutline({
        tenant,
        projectId: project.id,
        researchSessionId: dto.research_session_id ?? null,
        title: dto.topic.slice(0, 200),
        description: null,
        style,
        provider: routed.provider,
        estimatedMinutes: duration,
        metadata: { unstructured: true, model: routed.model, provider: routed.provider },
        sections: [
          {
            title: "Generated outline",
            description: routed.text,
            estimatedMinutes: duration,
            talkingPoints: [],
            transition: null,
          },
        ],
        questions: [],
      });
      return this.assemble(outline, routed);
    }

    const sections = (Array.isArray(parsed.sections) ? parsed.sections : [])
      .filter((s): s is RawSection => typeof s === "object" && s !== null)
      .map((section) => ({
        title: asString(section.title) ?? "Untitled section",
        description: asString(section.description),
        estimatedMinutes: asMinutes(section.estimated_minutes),
        talkingPoints: asStringArray(section.talking_points),
        transition: asString(section.transition),
      }));

    const sectionMinutes = sections.reduce((sum, s) => sum + (s.estimatedMinutes ?? 0), 0);

    const outline = await this.repository.saveOutline({
      tenant,
      projectId: project.id,
      researchSessionId: dto.research_session_id ?? null,
      title: asString(parsed.title) ?? dto.topic.slice(0, 200),
      description: asString(parsed.description),
      style,
      provider: routed.provider,
      estimatedMinutes: sectionMinutes > 0 ? sectionMinutes : duration,
      metadata: {
        model: routed.model,
        provider: routed.provider,
        style,
        target_minutes: duration,
        hook: asString(parsed.hook),
        call_to_action: asString(parsed.call_to_action),
        closing: asString(parsed.closing),
      },
      sections,
      questions: asStringArray(parsed.questions).slice(0, 15),
    });

    this.logger.log({
      outline: outline.id,
      sections: sections.length,
      minutes: sectionMinutes,
      credits: routed.creditsSpent,
    });

    return this.assemble(outline, routed);
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

  private assemble(
    outline: { id: string },
    routed: { provider: string; model: string; creditsSpent: number },
  ) {
    return {
      ...outline,
      provider: routed.provider,
      model: routed.model,
      credits_spent: routed.creditsSpent,
    };
  }
}
