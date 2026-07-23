import { Injectable, Logger } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { NotificationRepository } from "./notification.repository";
import type {
  ListNotificationsQueryDto,
  UpdateNotificationPreferencesDto,
} from "./dto/notification.dto";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly repository: NotificationRepository) {}

  async list(tenant: TenantContext, query: ListNotificationsQueryDto) {
    const [items, unread] = await Promise.all([
      this.repository.list(tenant, query),
      this.repository.unreadCount(tenant),
    ]);
    return { items, unread_count: unread };
  }

  markRead(tenant: TenantContext, id: string) {
    return this.repository.markRead(tenant, id);
  }

  async markAllRead(tenant: TenantContext) {
    return { marked: await this.repository.markAllRead(tenant) };
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }

  getPreferences(tenant: TenantContext) {
    return this.repository.getPreferences(tenant);
  }

  updatePreferences(tenant: TenantContext, dto: UpdateNotificationPreferencesDto) {
    return this.repository.updatePreferences(tenant, { ...dto });
  }

  /**
   * Emit a notification from another module. Failures are logged and
   * swallowed: a notification is never important enough to fail the action
   * that triggered it.
   */
  async notify(input: {
    userId: string;
    organizationId?: string | null;
    projectId?: string | null;
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string | null;
  }): Promise<void> {
    try {
      await this.repository.emit(input);
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "could not write notification",
      );
    }
  }
}
