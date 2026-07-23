import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

/**
 * Admin repository — the only place that reads across tenants.
 *
 * Every statement here is intentionally unscoped, which is exactly why the
 * controller is behind AdminGuard. Queries are aggregate-first: the platform
 * view should answer "how is the product doing" without dragging personal
 * content into an admin screen that has no reason to show it.
 */
@Injectable()
export class AdminRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Headline numbers for the admin dashboard. */
  async overview() {
    const { rows } = await this.pool.query(
      `select
         (select count(*) from public.profiles)                                as users,
         (select count(*) from public.profiles
           where created_at > now() - interval '7 days')                       as users_7d,
         (select count(*) from public.organizations)                           as organizations,
         (select count(*) from public.projects)                                as projects,
         (select count(*) from public.ai_requests)                             as ai_requests,
         (select count(*) from public.ai_requests where success = false)       as ai_failures,
         (select coalesce(sum(total_tokens), 0) from public.ai_requests)       as tokens,
         (select coalesce(sum(estimated_cost), 0) from public.ai_requests)     as ai_cost,
         (select count(*) from public.organization_subscriptions where status = 'active')   as active_subscriptions,
         (select coalesce(sum(amount), 0) from public.invoices
           where status = 'paid')                                              as revenue,
         (select count(*) from public.support_tickets
           where status <> 'closed')                                           as open_tickets`,
    );
    return rows[0]!;
  }

  /** AI usage by day, for the last N days. */
  async aiUsage(days = 30) {
    const { rows } = await this.pool.query(
      `select date_trunc('day', created_at)::date as day,
              count(*)                              as requests,
              count(*) filter (where success = false) as failures,
              coalesce(sum(total_tokens), 0)        as tokens,
              coalesce(sum(estimated_cost), 0)      as cost
         from public.ai_requests
        where created_at > now() - ($1 || ' days')::interval
        group by 1
        order by 1`,
      [days],
    );
    return rows;
  }

  /** Which tasks and models the platform actually leans on. */
  async aiBreakdown() {
    const { rows } = await this.pool.query(
      `select task::text as task,
              count(*)                                as requests,
              count(*) filter (where success = false)  as failures,
              round(avg(latency_ms))                   as avg_latency_ms,
              coalesce(sum(total_tokens), 0)           as tokens
         from public.ai_requests
        group by 1
        order by requests desc`,
    );
    return rows;
  }

  /**
   * Organizations with their usage. Deliberately aggregate — an admin needs
   * to see who is heavy or stuck, not to read anyone's scripts.
   */
  async organizations(limit = 50) {
    const { rows } = await this.pool.query(
      `select o.id, o.name, o.slug::text as slug, o.created_at,
              b.available_credits, b.used_credits,
              (select count(*) from public.workspaces w
                where w.organization_id = o.id)                     as workspaces,
              (select count(*) from public.projects p
                join public.workspaces w on w.id = p.workspace_id
               where w.organization_id = o.id)                      as projects,
              (select count(*) from public.ai_requests r
                where r.organization_id = o.id)                     as ai_requests,
              (select max(r.created_at) from public.ai_requests r
                where r.organization_id = o.id)                     as last_activity,
              (select s.status from public.organization_subscriptions s
                where s.organization_id = o.id
                order by s.created_at desc limit 1)                 as subscription_status
         from public.organizations o
         left join public.ai_credit_balances b on b.organization_id = o.id
        order by o.created_at desc
        limit $1`,
      [limit],
    );
    return rows;
  }

  /* ------------------------------------------------------------ flags */

  async listFlags() {
    const { rows } = await this.pool.query(
      `select id, name, description, enabled, rollout_percentage, updated_at
         from public.feature_flags order by name`,
    );
    return rows;
  }

  async upsertFlag(input: {
    name: string;
    description?: string | null;
    enabled?: boolean;
    rollout_percentage?: number;
  }) {
    const { rows } = await this.pool.query(
      `insert into public.feature_flags (name, description, enabled, rollout_percentage)
       values ($1, $2, coalesce($3, false), coalesce($4, 0))
       on conflict (name) do update
          set description        = coalesce(excluded.description, feature_flags.description),
              enabled            = coalesce($3, feature_flags.enabled),
              rollout_percentage = coalesce($4, feature_flags.rollout_percentage),
              updated_at         = now()
       returning id, name, description, enabled, rollout_percentage, updated_at`,
      [
        input.name,
        input.description ?? null,
        input.enabled ?? null,
        input.rollout_percentage ?? null,
      ],
    );
    return rows[0]!;
  }

  async deleteFlag(id: string) {
    const { rowCount } = await this.pool.query(
      `delete from public.feature_flags where id = $1`,
      [id],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Feature flag not found" });
    }
  }

  /* ---------------------------------------------------- announcements */

  async listAnnouncements() {
    const { rows } = await this.pool.query(
      `select id, title, message, severity, starts_at, ends_at, is_active, created_at
         from public.system_announcements
        order by created_at desc
        limit 50`,
    );
    return rows;
  }

  async createAnnouncement(
    createdByUserId: string,
    input: {
      title: string;
      message: string;
      severity?: string;
      starts_at?: string | null;
      ends_at?: string | null;
    },
  ) {
    // created_by references admin_users(id), not auth.users(id), so the
    // caller's user id has to be resolved to their admin record first.
    const { rows } = await this.pool.query(
      `insert into public.system_announcements
         (title, message, severity, starts_at, ends_at, created_by)
       values ($1,$2,coalesce($3,'info'),coalesce($4::timestamptz, now()),$5::timestamptz,
               (select id from public.admin_users where user_id = $6 and is_active = true))
       returning id, title, message, severity, starts_at, ends_at, is_active, created_at`,
      [
        input.title,
        input.message,
        input.severity ?? null,
        input.starts_at ?? null,
        input.ends_at ?? null,
        createdByUserId,
      ],
    );
    return rows[0]!;
  }

  async setAnnouncementActive(id: string, isActive: boolean) {
    const { rows } = await this.pool.query(
      `update public.system_announcements set is_active = $2 where id = $1
       returning id, title, message, severity, starts_at, ends_at, is_active, created_at`,
      [id, isActive],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Announcement not found" });
    }
    return rows[0];
  }

  /* --------------------------------------------------------- tickets */

  async listTickets(status?: string) {
    const params: unknown[] = [];
    let where = "";
    if (status) {
      params.push(status);
      where = `where t.status = $1`;
    }
    const { rows } = await this.pool.query(
      `select t.id, t.subject, t.description, t.priority, t.status, t.created_at,
              o.name as organization_name, p.email::text as user_email
         from public.support_tickets t
         left join public.organizations o on o.id = t.organization_id
         left join public.profiles p on p.id = t.user_id
         ${where}
        order by
          case t.priority when 'urgent' then 0 when 'high' then 1
                          when 'normal' then 2 else 3 end,
          t.created_at desc
        limit 100`,
      params,
    );
    return rows;
  }

  async updateTicketStatus(id: string, status: string, adminUserId: string) {
    // assigned_admin references admin_users(id) like created_by does.
    const { rows } = await this.pool.query(
      `update public.support_tickets
          set status = $2,
              assigned_admin = (select id from public.admin_users
                                 where user_id = $3 and is_active = true),
              updated_at = now()
        where id = $1
        returning id, subject, priority, status, updated_at`,
      [id, status, adminUserId],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Ticket not found" });
    }
    return rows[0];
  }

  /* ---------------------------------------------------------- health */

  /**
   * System health is measured here rather than read from a table that nothing
   * writes to: a stale row claiming "ok" is worse than no row at all.
   */
  async health() {
    const started = Date.now();
    await this.pool.query("select 1");
    const dbLatency = Date.now() - started;

    const { rows } = await this.pool.query(
      `select
         (select count(*) from public.ai_requests
           where created_at > now() - interval '1 hour')                 as ai_requests_1h,
         (select count(*) from public.ai_requests
           where success = false
             and created_at > now() - interval '1 hour')                 as ai_failures_1h,
         (select count(*) from public.ai_agent_sessions
           where status = 'running')                                     as running_pipelines,
         (select count(*) from public.ai_agent_tasks
           where status in ('queued','running')
             and created_at < now() - interval '20 minutes')             as stuck_tasks`,
    );

    const stats = rows[0]!;
    const requests = Number(stats.ai_requests_1h);
    const failures = Number(stats.ai_failures_1h);

    return {
      database: { status: "up", latency_ms: dbLatency },
      ai: {
        requests_1h: requests,
        failures_1h: failures,
        failure_rate: requests > 0 ? Number((failures / requests).toFixed(3)) : 0,
      },
      pipelines: {
        running: Number(stats.running_pipelines),
        stuck: Number(stats.stuck_tasks),
      },
      checked_at: new Date().toISOString(),
    };
  }

  /** Recent AI errors — the fastest way to see what is actually breaking. */
  async recentErrors(limit = 25) {
    const { rows } = await this.pool.query(
      `select r.id, r.task::text as task, r.error_message, r.latency_ms, r.created_at,
              o.name as organization_name
         from public.ai_requests r
         left join public.organizations o on o.id = r.organization_id
        where r.success = false
        order by r.created_at desc
        limit $1`,
      [limit],
    );
    return rows;
  }
}
