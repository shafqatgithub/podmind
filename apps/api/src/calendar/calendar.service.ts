import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { AiRouterService } from "../ai/routing/ai-router.service";
import { BaseHttpProvider } from "../ai/providers/base-http.provider";
import { buildCalendarSuggestMessages } from "./calendar.prompt";
import { AgentService } from "../agents/agent.service";
import type { TenantContext } from "../tenancy/tenancy.service";
import { CalendarRepository } from "./calendar.repository";
import type {
  CreateEntryDto,
  ListEntriesQueryDto,
  PlanScheduleDto,
  SuggestScheduleDto,
  UpdateEntryDto,
} from "./dto/calendar.dto";

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v.trim()) : [];

const asObjectArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    : [];

/** Days between slots for each cadence. */
const CADENCE_DAYS: Record<PlanScheduleDto["cadence"], number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 28,
};

/** Adds days to an ISO date without dragging in a date library. */
function addDays(iso: string, days: number): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(reference = new Date()): { from: string; to: string } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

@Injectable()
export class CalendarService {
  constructor(
    private readonly repository: CalendarRepository,
    private readonly agents: AgentService,
    private readonly router: AiRouterService,
  ) {}

  /**
   * Ask the AI for a run of episodes — and save nothing.
   *
   * The proposal comes back for the host to change or reject. Writing a
   * generated schedule straight into someone's calendar would make the
   * feature a chore to undo rather than a head start, and the host is the one
   * who knows which weeks they can actually record.
   */
  async suggest(tenant: TenantContext, dto: SuggestScheduleDto) {
    const project = await this.repository.findProjectContext(tenant, dto.project_id);

    const routed = await this.router.route({
      organizationId: tenant.organizationId,
      task: "outline",
      messages: buildCalendarSuggestMessages({
        count: dto.count ?? 4,
        cadence: dto.cadence ?? "weekly",
        niche: project.niche,
        audience: project.audience,
        podcastName: project.podcast_name,
        language: dto.language ?? project.language,
        existingTitles: project.existingTitles,
        theme: dto.theme ?? null,
      }),
      projectId: dto.project_id,
      jsonMode: true,
      maxTokens: 8_000,
      preferredProvider: dto.provider ?? null,
    });

    const parsed = BaseHttpProvider.extractJson(routed.text);
    if (!parsed) {
      throw new ServiceUnavailableException({
        code: "AI_INVALID_OUTPUT",
        message: "The schedule came back unreadable. Please try again.",
      });
    }

    const start = dto.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const step = CADENCE_DAYS[dto.cadence ?? "weekly"];

    // Dates are assigned here rather than asked of the model: cadence
    // arithmetic is exact, and a model that drifts by a day produces a
    // schedule the host has to check line by line.
    const episodes = asObjectArray(parsed.episodes)
      .map((raw, index) => ({
        title: asString(raw.title) ?? "",
        topic: asString(raw.topic),
        angle: asString(raw.angle),
        format: asString(raw.format),
        effort: asString(raw.effort),
        guest_suggestion: asString(raw.guest_suggestion),
        notes: asString(raw.notes),
        scheduled_for: addDays(start, index * step),
      }))
      .filter((e) => e.title.length > 0);

    if (episodes.length === 0) {
      throw new ServiceUnavailableException({
        code: "AI_INVALID_OUTPUT",
        message: "No usable episodes came back. Please try again.",
      });
    }

    return {
      episodes,
      arc: asString(parsed.arc),
      cautions: asStringArray(parsed.cautions),
      cadence: dto.cadence ?? "weekly",
      start_date: start,
      credits_spent: routed.creditsSpent,
    };
  }

  /** Defaults to the current month, which is what a calendar view wants. */
  async list(tenant: TenantContext, query: ListEntriesQueryDto) {
    const bounds = query.from && query.to ? null : monthBounds();
    const items = await this.repository.list(tenant, {
      projectId: query.project_id,
      from: query.from ?? bounds?.from,
      to: query.to ?? bounds?.to,
    });
    return {
      items,
      from: query.from ?? bounds!.from,
      to: query.to ?? bounds!.to,
    };
  }

  async create(tenant: TenantContext, dto: CreateEntryDto) {
    await this.repository.assertProjectInTenant(tenant, dto.project_id);
    this.assertOrder(dto.scheduled_for, dto.publish_at);

    return this.repository.create(tenant, {
      projectId: dto.project_id,
      title: dto.title,
      topic: dto.topic ?? null,
      notes: dto.notes ?? null,
      scheduledFor: dto.scheduled_for.slice(0, 10),
      publishAt: dto.publish_at?.slice(0, 10) ?? null,
      guestId: dto.guest_id ?? null,
    });
  }

  /**
   * Lay a list of episodes across a cadence starting from a date.
   *
   * This is how planning actually happens — a month of slots decided in one
   * sitting — rather than creating entries one at a time and doing the date
   * arithmetic by hand.
   */
  async plan(tenant: TenantContext, dto: PlanScheduleDto) {
    await this.repository.assertProjectInTenant(tenant, dto.project_id);

    const step = CADENCE_DAYS[dto.cadence];
    const offset = dto.publish_offset_days ?? 0;
    const start = dto.start_date.slice(0, 10);

    const entries = dto.items.map((item, index) => {
      const scheduledFor = addDays(start, index * step);
      return {
        title: item.title,
        topic: item.topic ?? item.title,
        scheduledFor,
        publishAt: offset > 0 ? addDays(scheduledFor, offset) : null,
      };
    });

    const created = await this.repository.createMany(tenant, dto.project_id, entries);

    // Return the window the plan occupies, so the UI can jump straight to it.
    const last = entries[entries.length - 1]!;
    return {
      created,
      from: start,
      to: last.publishAt ?? last.scheduledFor,
    };
  }

  async update(tenant: TenantContext, id: string, dto: UpdateEntryDto) {
    if (dto.scheduled_for || dto.publish_at) {
      const existing = await this.repository.findOne(tenant, id);
      this.assertOrder(
        dto.scheduled_for ?? existing.scheduled_for,
        dto.publish_at ?? existing.publish_at,
      );
    }
    return this.repository.update(tenant, id, { ...dto });
  }

  /**
   * Run the full pipeline for a planned slot and remember which run it was,
   * so the calendar entry links to the work rather than merely describing it.
   */
  async runPipeline(tenant: TenantContext, id: string) {
    const entry = await this.repository.findOne(tenant, id);

    const run = await this.agents.createRun(tenant, {
      project_id: entry.project_id,
      topic: entry.topic ?? entry.title,
      steps: ["research", "outline", "script"],
      ...(entry.guest_name ? { guest_name: entry.guest_name } : {}),
    });

    await this.repository.attachSession(tenant, id, run.id);
    return this.repository.findOne(tenant, id);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }

  /** Publishing before recording is a typo, not an intention. */
  private assertOrder(
    scheduledFor: string | Date,
    publishAt: string | Date | null | undefined,
  ): void {
    if (!publishAt) return;
    // Values arriving from the request are ISO strings, but the ones read
    // back from Postgres are Date objects — comparing them without
    // normalising silently did nothing.
    const asDay = (value: string | Date): string =>
      value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);

    if (asDay(publishAt) < asDay(scheduledFor)) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "The publish date cannot be before the recording date",
      });
    }
  }
}
