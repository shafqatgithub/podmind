import {
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
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { CalendarService } from "./calendar.service";
import {
  CreateEntryDto,
  ListEntriesQueryDto,
  PlanScheduleDto,
  UpdateEntryDto,
} from "./dto/calendar.dto";

/** Content calendar — /api/v1/calendar */
@Controller("calendar")
export class CalendarController {
  constructor(
    private readonly calendar: CalendarService,
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
