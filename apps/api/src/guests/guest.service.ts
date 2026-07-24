import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import type { TenantContext } from "../tenancy/tenancy.service";
import { GuestRepository, type GuestBriefingInput } from "./guest.repository";
import { buildGuestMessages, GUEST_MAX_TOKENS, QUESTION_BUCKETS } from "./guest.prompt";
import {
  buildGuestDiscoveryMessages,
  GUEST_DISCOVERY_MAX_TOKENS,
  REACHABILITY,
} from "./guest-discovery.prompt";
import { ProviderRegistry } from "../ai/providers/provider.registry";
import type {
  CreateGuestDto,
  CreateGuestManualDto,
  DiscoverGuestsDto,
  ListGuestsQueryDto,
} from "./dto/guest.dto";
import type { SelectableProvider } from "../research/dto/research.dto";

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

/**
 * A year like "2010" is stored in a date column, so it becomes 2010-01-01.
 * Anything that is not a usable year is dropped rather than guessed at.
 */
function yearToDate(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const match = /^(\d{4})/.exec(text);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1900 || year > new Date().getFullYear() + 1) return null;
  return `${year}-01-01`;
}

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    private readonly repository: GuestRepository,
    private readonly router: AiRouterService,
    private readonly registry: ProviderRegistry,
  ) {}

  /** Research a person and store the full briefing. Consumes 8 credits. */
  async research(tenant: TenantContext, dto: CreateGuestDto) {
    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "guest",
      messages: buildGuestMessages({
        fullName: dto.full_name,
        context: dto.context,
        podcastName: project.podcast_name,
        audience: project.audience,
        niche: project.niche,
        language: project.language,
      }),
      projectId: project.id,
      jsonMode: true,
      maxTokens: GUEST_MAX_TOKENS,
      temperature: 0.3,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;

    if (!parsed) {
      // Keep the work rather than discarding something the user paid for.
      this.logger.warn({ guest: dto.full_name }, "guest research output was not valid JSON");
      const guest = await this.repository.saveBriefing(
        tenant,
        {
          projectId: project.id,
          fullName: dto.full_name,
          headline: null,
          biography: routed.text,
          company: null,
          jobTitle: null,
          industry: null,
          country: null,
          metadata: { unstructured: true, model: routed.model, provider: routed.provider },
        },
        { companies: [], books: [], interviews: [], social: [], questions: [], tags: [] },
      );
      return this.repository.findOne(tenant, guest.id);
    }

    const questions: GuestBriefingInput["questions"] = [];
    for (const bucket of QUESTION_BUCKETS) {
      for (const question of strArray(parsed[bucket.key])) {
        questions.push({
          question,
          question_type: bucket.type,
          difficulty: bucket.difficulty,
        });
      }
    }

    const confidence =
      typeof parsed.confidence_score === "number" && Number.isFinite(parsed.confidence_score)
        ? Math.min(Math.max(parsed.confidence_score, 0), 1)
        : null;

    const related: GuestBriefingInput = {
      companies: objArray(parsed.companies)
        .map((c) => ({
          company_name: str(c.company_name) ?? "",
          role: str(c.role),
          start_date: yearToDate(c.start_year),
          end_date: yearToDate(c.end_year),
          is_current: c.is_current === true,
          description: str(c.description),
        }))
        .filter((c) => c.company_name),
      books: objArray(parsed.books)
        .map((b) => ({
          title: str(b.title) ?? "",
          publisher: str(b.publisher),
          published_date: yearToDate(b.year),
          description: str(b.description),
        }))
        .filter((b) => b.title),
      interviews: objArray(parsed.interviews)
        .map((i) => ({
          platform: str(i.platform),
          interview_title: str(i.title),
          interview_url: str(i.url),
          interview_date: yearToDate(i.year),
          summary: str(i.summary),
        }))
        .filter((i) => i.interview_title || i.platform),
      social: objArray(parsed.social_profiles)
        .map((s) => ({
          platform: (str(s.platform) ?? "").toLowerCase(),
          username: str(s.username),
          profile_url: str(s.profile_url),
        }))
        .filter((s) => s.platform),
      questions,
      // Tags are derived from fields we already trust rather than asking the
      // model for a separate list it would only re-guess.
      tags: [...new Set([str(parsed.industry), str(parsed.country)].filter(Boolean) as string[])],
    };

    const metadata = {
      model: routed.model,
      provider: routed.provider,
      confidence_score: confidence,
      career_timeline: objArray(parsed.career_timeline),
      awards: strArray(parsed.awards),
      interesting_facts: strArray(parsed.interesting_facts),
      controversies: strArray(parsed.controversies),
      conversation_opportunities: strArray(parsed.conversation_opportunities),
      uncertainties: strArray(parsed.uncertainties),
      sources: objArray(parsed.sources),
    };

    const guest = await this.repository.saveBriefing(
      tenant,
      {
        projectId: project.id,
        fullName: dto.full_name,
        headline: str(parsed.headline),
        biography: str(parsed.biography),
        company: str(parsed.company),
        jobTitle: str(parsed.job_title),
        industry: str(parsed.industry),
        country: str(parsed.country),
        metadata,
      },
      related,
    );

    this.logger.log({
      guest: guest.id,
      provider: routed.provider,
      questions: questions.length,
      confidence,
      credits: routed.creditsSpent,
    });

    return this.repository.findOne(tenant, guest.id);
  }

  /** Add a guest by hand — no AI, no credits. */
  async createManual(tenant: TenantContext, dto: CreateGuestManualDto) {
    await this.repository.assertProjectInTenant(tenant, dto.project_id);
    const guest = await this.repository.createManual(tenant, {
      projectId: dto.project_id,
      fullName: dto.full_name,
      headline: dto.headline,
      company: dto.company,
      jobTitle: dto.job_title,
      email: dto.email,
      websiteUrl: dto.website_url,
    });
    return this.repository.findOne(tenant, guest.id);
  }

  async list(tenant: TenantContext, query: ListGuestsQueryDto) {
    return { items: await this.repository.list(tenant, query) };
  }

  findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  addNote(tenant: TenantContext, id: string, note: string) {
    return this.repository.addNote(tenant, id, note);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
  /* ------------------------------------------------- discovery */

  /** Whether any configured provider can search; discovery needs one. */
  searchAvailable(): boolean {
    return this.registry
      .all()
      .some((p) => p.isConfigured() && p.supportsWebSearch?.() === true);
  }

  /**
   * Find candidate guests for a topic.
   *
   * These are leads, not briefings — deliberately shallow, because the
   * expensive deep-dive should happen after a human has picked someone.
   */
  async discover(tenant: TenantContext, dto: DiscoverGuestsDto) {
    if (!this.searchAvailable()) {
      throw new ServiceUnavailableException({
        code: "SEARCH_UNAVAILABLE",
        message:
          "Guest discovery needs a provider with web search. Add an Anthropic API key to enable it.",
      });
    }

    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);
    const excludeNames = await this.repository.suggestedNames(project.id);

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "guest",
      messages: buildGuestDiscoveryMessages({
        topic: dto.topic,
        country: dto.country,
        podcastName: project.podcast_name,
        audience: project.audience,
        excludeNames,
        language: project.language,
      }),
      projectId: project.id,
      jsonMode: true,
      webSearch: true,
      maxTokens: GUEST_DISCOVERY_MAX_TOKENS,
      temperature: 0.4,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text) as Record<string, unknown> | null;
    if (!parsed) {
      throw new ServiceUnavailableException({
        code: "AI_UNAVAILABLE",
        message: "The model did not return usable suggestions. Please try again.",
      });
    }

    const suggestions = objArray(parsed.guests)
      .map((g) => ({
        full_name: str(g.full_name) ?? "",
        headline: str(g.headline),
        why_them: str(g.why_them),
        expertise: str(g.expertise),
        reachability: REACHABILITY.has(String(g.reachability ?? "").toLowerCase())
          ? String(g.reachability).toLowerCase()
          : null,
        profile_urls: objArray(g.profile_urls).filter((u) => str(u.url)),
        sources: objArray(g.sources).filter((src) => str(src.url) ?? str(src.title)),
        confidence:
          typeof g.confidence === "number" && Number.isFinite(g.confidence)
            ? Math.min(Math.max(g.confidence, 0), 1)
            : null,
      }))
      // A person with no source is a guess, not a lead — and guessing about
      // real people is the one thing this feature must never do.
      .filter((g) => g.full_name && g.sources.length > 0);

    if (suggestions.length === 0) {
      throw new ServiceUnavailableException({
        code: "NO_SOURCED_GUESTS",
        message:
          "No guests came back with a source behind them. Try describing the topic differently.",
      });
    }

    await this.repository.saveSuggestions(
      tenant,
      project.id,
      dto.topic,
      dto.country ?? null,
      suggestions,
    );

    this.logger.log({
      topic: dto.topic,
      suggested: suggestions.length,
      dropped: objArray(parsed.guests).length - suggestions.length,
      provider: routed.provider,
    });

    return {
      topic: dto.topic,
      summary: str(parsed.summary),
      angles: strArray(parsed.angles),
      notes: strArray(parsed.notes),
      dropped_unsourced: objArray(parsed.guests).length - suggestions.length,
      items: await this.repository.listSuggestions(tenant, project.id, dto.topic),
    };
  }

  listSuggestions(tenant: TenantContext, projectId?: string, topic?: string) {
    return this.repository
      .listSuggestions(tenant, projectId, topic)
      .then((items) => ({ items }));
  }

  /**
   * Promote a lead into a full briefing by running the existing guest
   * research on it. The suggestion's headline is passed as identifying
   * context, which is what stops the briefing landing on a different person
   * with the same name.
   */
  async promote(tenant: TenantContext, suggestionId: string, provider?: SelectableProvider) {
    const suggestion = await this.repository.findSuggestion(tenant, suggestionId);

    if (suggestion.guest_id) {
      // Already researched: return what exists rather than charging twice.
      return this.repository.findOne(tenant, suggestion.guest_id);
    }

    const guest = await this.research(tenant, {
      project_id: suggestion.project_id,
      full_name: suggestion.full_name,
      context: [suggestion.headline, suggestion.expertise, suggestion.country]
        .filter(Boolean)
        .join(" — "),
      ...(provider ? { provider } : {}),
    });

    await this.repository.linkSuggestionToGuest(suggestionId, guest.id);
    return guest;
  }

}
