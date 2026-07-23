import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { ListNotificationsQueryDto } from "./dto/notification.dto";

const COLUMNS = `id, organization_id, project_id, type::text as type, title, message,
                 priority, action_url, icon, is_read, read_at, metadata, created_at`;

/** Notifications are per user; every statement is scoped by user_id. */
@Injectable()
export class NotificationRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async list(tenant: TenantContext, query: ListNotificationsQueryDto) {
    const params: unknown[] = [tenant.userId];
    const where = ["user_id = $1"];

    if (query.type) {
      params.push(query.type);
      where.push(`type = $${params.length}::notification_type`);
    }
    if (query.unread_only) where.push("is_read = false");

    params.push(query.limit ?? 50);
    const { rows } = await this.pool.query(
      `select ${COLUMNS} from public.notifications
        where ${where.join(" and ")}
        order by is_read asc, created_at desc
        limit $${params.length}`,
      params,
    );
    return rows;
  }

  async unreadCount(tenant: TenantContext): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `select count(*)::text as count from public.notifications
        where user_id = $1 and is_read = false`,
      [tenant.userId],
    );
    return Number(rows[0]!.count);
  }

  async markRead(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query(
      `update public.notifications set is_read = true, read_at = now()
        where id = $1 and user_id = $2 returning ${COLUMNS}`,
      [id, tenant.userId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Notification not found" });
    }
    return row;
  }

  async markAllRead(tenant: TenantContext): Promise<number> {
    const { rowCount } = await this.pool.query(
      `update public.notifications set is_read = true, read_at = now()
        where user_id = $1 and is_read = false`,
      [tenant.userId],
    );
    return rowCount ?? 0;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `delete from public.notifications where id = $1 and user_id = $2`,
      [id, tenant.userId],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Notification not found" });
    }
  }

  /** Preferences are provisioned on first read with the documented defaults. */
  async getPreferences(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `insert into public.notification_preferences (user_id)
       values ($1)
       on conflict (user_id) do update set user_id = excluded.user_id
       returning id, email_enabled, push_enabled, in_app_enabled, sms_enabled,
                 marketing_enabled, quiet_hours_enabled, quiet_start, quiet_end, timezone`,
      [tenant.userId],
    );
    return rows[0]!;
  }

  async updatePreferences(tenant: TenantContext, patch: Record<string, unknown>) {
    await this.getPreferences(tenant);

    const allowed = [
      "email_enabled", "push_enabled", "in_app_enabled", "marketing_enabled",
      "quiet_hours_enabled", "quiet_start", "quiet_end", "timezone",
    ] as const;

    const sets: string[] = [];
    const params: unknown[] = [tenant.userId];
    for (const field of allowed) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.getPreferences(tenant);

    const { rows } = await this.pool.query(
      `update public.notification_preferences set ${sets.join(", ")}, updated_at = now()
        where user_id = $1
        returning id, email_enabled, push_enabled, in_app_enabled, sms_enabled,
                  marketing_enabled, quiet_hours_enabled, quiet_start, quiet_end, timezone`,
      params,
    );
    return rows[0]!;
  }

  /**
   * Creates a notification. Called by other modules, not by the HTTP layer —
   * users receive notifications, they do not author them.
   */
  async emit(input: {
    userId: string;
    organizationId?: string | null;
    projectId?: string | null;
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string | null;
  }) {
    const { rows } = await this.pool.query(
      `insert into public.notifications
         (user_id, organization_id, project_id, type, title, message, priority, action_url)
       values ($1,$2,$3,$4::notification_type,$5,$6,$7,$8)
       returning ${COLUMNS}`,
      [
        input.userId,
        input.organizationId ?? null,
        input.projectId ?? null,
        input.type,
        input.title,
        input.message,
        input.priority ?? "normal",
        input.actionUrl ?? null,
      ],
    );
    return rows[0]!;
  }
}
