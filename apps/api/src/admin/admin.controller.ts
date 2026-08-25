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
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import {
  AdjustCreditsDto,
  CreateAnnouncementDto,
  SetAccessDto,
  SetActiveDto,
  UpdateOrgDto,
  UpdateTicketDto,
  UpsertFlagDto,
  UsageQueryDto,
  UsersQueryDto,
} from "./dto/admin.dto";

/**
 * Admin API — /api/v1/admin
 *
 * Every route reads across tenants, so the guard is applied at the controller
 * rather than per handler: a new endpoint added here is protected by default
 * instead of being protected only if someone remembers.
 */
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  dashboard() {
    return this.admin.dashboard();
  }

  @Get("organizations")
  organizations() {
    return this.admin.organizations();
  }

  @Get("ai-usage")
  aiUsage(@Query() query: UsageQueryDto) {
    return this.admin.aiUsage(query.days);
  }

  @Get("health")
  health() {
    return this.admin.health();
  }

  @Get("flags")
  listFlags() {
    return this.admin.listFlags();
  }

  @Post("flags")
  upsertFlag(@Body() dto: UpsertFlagDto) {
    return this.admin.upsertFlag(dto);
  }

  @Delete("flags/:id")
  deleteFlag(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.deleteFlag(id);
  }

  @Get("announcements")
  listAnnouncements() {
    return this.admin.listAnnouncements();
  }

  @Post("announcements")
  createAnnouncement(@CurrentUser() user: AuthUser, @Body() dto: CreateAnnouncementDto) {
    return this.admin.createAnnouncement(user.id, dto);
  }

  @Patch("announcements/:id")
  setAnnouncementActive(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.admin.setAnnouncementActive(id, dto.is_active);
  }

  @Get("tickets")
  listTickets(@Query("status") status?: string) {
    return this.admin.listTickets(status);
  }

  @Patch("tickets/:id")
  updateTicket(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.admin.updateTicket(id, user.id, dto);
  }

  /* ---------------------------------------------------- user management */

  /** The caller's admin record — the separate admin login calls this to
   *  confirm the account is an administrator before letting them in. */
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.admin.me(user.id);
  }

  @Get("users")
  users(@Query() query: UsersQueryDto) {
    return this.admin.users(query.search, query.limit, query.offset);
  }

  @Patch("users/:id/access")
  setUserAccess(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetAccessDto,
  ) {
    return this.admin.setUserAccess(id, dto.is_active);
  }

  @Post("organizations/:id/credits")
  adjustCredits(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AdjustCreditsDto,
  ) {
    return this.admin.adjustCredits(id, dto.amount, dto.reason);
  }

  @Delete("organizations/:orgId/members/:userId")
  removeMember(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
  ) {
    return this.admin.removeMember(orgId, userId);
  }

  @Patch("organizations/:id")
  updateOrganization(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.admin.updateOrganization(id, dto);
  }
}
