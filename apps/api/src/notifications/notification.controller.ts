import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { NotificationService } from "./notification.service";
import {
  ListNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
} from "./dto/notification.dto";

/** Notifications — /api/v1/notifications */
@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListNotificationsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.list(tenant, query);
  }

  @Get("preferences")
  async getPreferences(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.getPreferences(tenant);
  }

  @Patch("preferences")
  async updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.updatePreferences(tenant, dto);
  }

  @Post("read-all")
  async markAllRead(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.markAllRead(tenant);
  }

  @Patch(":id/read")
  async markRead(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.markRead(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.notifications.remove(tenant, id);
  }
}
