import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { FactCheckRepository } from "./fact-check.repository";
import {
  buildFactCheckMessages,
  CLAIM_TYPES,
  FACT_CHECK_MAX_TOKENS,
  FLAGGED_VERDICTS,
  VERDICTS,
  type ClaimType,
  type Verdict,
} from "./fact-check.prompt";
import type { CreateFactCheckDto } from "./dto/fact-check.dto";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

const VERDICT_SET = new Set<string>(VERDICTS);
const TYPE_SET = new Set<string>(CLAIM_TYPES);

@Injectable()
export class FactCheckService {
  private readonly logger = new Logger(FactCheckService.name);

  constructor(
    private readonly repository: FactCheckRepository,
    private readonly router: AiRouterService,
  ) {}

  async create(tenant: TenantContext, dto: CreateFactCheckDto) {
    const project = await this.repository.findProjectInTenant(tenant, dto.project_id);

    const sources = [dto.script_id, dto.research_session_id, dto.text].filter(Boolean);
    if (sources.length === 0) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Provide a script, a research session, or text to check",
      });
    }
    if (sources.length > 1) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Check one source at a time",
      });
    }

    let text: string;
    let title: string;
    let context: string;

    if (dto.script_id) {
      const script = await this.repository.findScriptText(tenant, dto.script_id);
      text = script.content ?? "";
      title = dto.title ?? `Fact check: ${script.title}`;
      context = "A podcast script that is about to be recorded.";
    } else if (dto.research_session_id) {
      const session = await this.repository.findResearchText(
        tenant,
        dto.research_session_id,
      );
      text = [session.summary, session.content].filter(Boolean).join("\n\n");
      title = dto.title ?? `Fact check: ${session.title}`;
      context = "AI-generated research that will inform an episode.";
    } else {
      text = dto.text!;
      title = dto.title ?? "Fact check";
      context = "Text intended for a podcast episode.";
    }

    if (text.trim().length < 50) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "There is not enough text to check",
      });
    }

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "fact_check",
      messages: buildFactCheckMessages({
        text: text.slice(0, 60000),
        language: project.language,
        context,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: FACT_CHECK_MAX_TOKENS,
      temperature: 0.2,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;

    const claims = (
      parsed && Array.isArray(parsed.claims) ? parsed.claims : []
    )
      .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
      .map((raw) => {
        const verdict = asString(raw.verdict)?.toLowerCase() ?? "";
        const claimType = asString(raw.claim_type)?.toLowerCase() ?? "";
        const confidence =
          typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
            ? Math.min(Math.max(raw.confidence, 0), 1)
            : null;

        return {
          claim: asString(raw.claim) ?? "",
          claimType: (TYPE_SET.has(claimType) ? claimType : "other") as ClaimType,
          // An unrecognised verdict becomes "unverified", never "verified".
          // Failing safe matters more here than preserving the model's word.
          verdict: (VERDICT_SET.has(verdict) ? verdict : "unverified") as Verdict,
          confidence,
          explanation: asString(raw.explanation),
          correction: asString(raw.correction),
          evidence: asStringArray(raw.evidence),
        };
      })
      .filter((c) => c.claim.length > 0);

    const verifiedCount = claims.filter((c) => c.verdict === "verified").length;
    const flaggedCount = claims.filter((c) =>
      FLAGGED_VERDICTS.includes(c.verdict),
    ).length;

    const check = await this.repository.saveCheck({
      tenant,
      projectId: project.id,
      scriptId: dto.script_id ?? null,
      researchSessionId: dto.research_session_id ?? null,
      title,
      sourceText: text,
      provider: routed.provider,
      model: routed.model,
      metadata: {
        model: routed.model,
        provider: routed.provider,
        summary: parsed ? asString(parsed.summary) : null,
        unstructured: !parsed,
        // Stated plainly on every check, because a reader who forgets this
        // will over-trust a "verified" badge.
        disclaimer:
          "Checked by an AI model with no live sources. Treat this as a first pass, not a substitute for verifying anything you intend to state as fact.",
      },
      claims,
      verifiedCount,
      flaggedCount,
    });

    this.logger.log({
      check: check.id,
      claims: claims.length,
      flagged: flaggedCount,
      credits: routed.creditsSpent,
    });

    return {
      ...check,
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
