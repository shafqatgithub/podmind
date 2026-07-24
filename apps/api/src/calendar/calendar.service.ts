import { BadRequestException, Injectable } from "@nestjs/common";
import { AgentService } from "../agents/agent.service";
import type { TenantContext } from "../tenancy/tenancy.service";
import { CalendarRepository } from "./calendar.repository";
import type {
  CreateEntryDto,
  ListEntriesQueryDto,
  PlanScheduleDto,
  UpdateEntryDto,
} from "./dto/calendar.dto";

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
  ) {}

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
