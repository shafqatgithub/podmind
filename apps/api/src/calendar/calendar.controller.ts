import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, Public, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { CalendarService } from "./calendar.service";
import { CalendarReminderService } from "./calendar-reminder.service";
import {
  CreateEntryDto,
  ListEntriesQueryDto,
  PlanScheduleDto,
  SuggestScheduleDto,
  UpdateEntryDto,
} from "./dto/calendar.dto";

/** Content calendar — /api/v1/calendar */
@Controller("calendar")
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
    private readonly reminders: CalendarReminderService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListEntriesQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.list(tenant, query);
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateEntryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.create(tenant, dto);
  }

  /** Lay several episodes across a cadence in one go. */
  @Post("plan")
  async plan(@CurrentUser() user: AuthUser, @Body() dto: PlanScheduleDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.plan(tenant, dto);
  }

  /**
   * Emailed action links, reachable without a login.
   *
   * The token is the credential — single-use, expiring, scoped to one entry
   * and one action — because a host confirming a slot from their phone should
   * not have to sign in first, and a reminder that demands a login is a
   * reminder most people ignore.
   */
  @Public()
  @Get("actions/preview")
  async previewAction(@Query("token") token: string, @Query("purpose") purpose: string) {
    if (purpose !== "confirm" && purpose !== "reschedule") {
      throw new BadRequestException({ code: "INVALID_REQUEST", message: "Unknown action" });
    }
    const row = await this.reminders.resolveToken(token, purpose);
    return {
      title: row.title,
      scheduled_for: row.scheduled_for,
      project_title: row.project_title,
      already_used: Boolean(row.used_at),
    };
  }

  @Public()
  @Post("actions/confirm")
  async confirmFromEmail(@Body() body: { token: string }) {
    return this.reminders.confirm(body.token);
  }

  @Public()
  @Post("actions/reschedule")
  async rescheduleFromEmail(@Body() body: { token: string; scheduled_for: string }) {
    return this.reminders.reschedule(body.token, body.scheduled_for);
  }

  /** Proposes a run of episodes. Saves nothing — the host approves first. */
  @Post("suggest")
  async suggest(@CurrentUser() user: AuthUser, @Body() dto: SuggestScheduleDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.suggest(tenant, dto);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntryDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.update(tenant, id, dto);
  }

  /** Start the pipeline for a planned slot. */
  @Post(":id/run")
  async run(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.runPipeline(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.calendar.remove(tenant, id);
  }
}
