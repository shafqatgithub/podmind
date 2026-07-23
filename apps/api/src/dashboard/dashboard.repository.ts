import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface RecentProject {
  id: string;
  title: string;
  status: string;
  is_favorite: boolean;
  updated_at: string;
  document_count: number;
}

export interface RecentResearch {
  id: string;
  title: string;
  depth: string;
  project_title: string | null;
  confidence_score: number | null;
  created_at: string;
}

export interface RecentConversation {
  id: string;
  title: string;
  total_messages: number;
  updated_at: string;
}

export interface ActivityEvent {
  action: string;
  resource_type: string;
  created_at: string;
}

export interface WeeklyProgress {
  research_this_week: number;
  research_last_week: number;
  messages_this_week: number;
  documents_this_week: number;
}

/**
 * Dashboard repository.
 *
 * Reads only. Each widget is a small, independently useful query, so a slow
 * or empty one never blocks the rest of the page.
 */
@Injectable()
export class DashboardRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async recentProjects(tenant: TenantContext, limit = 5): Promise<RecentProject[]> {
    const { rows } = await this.pool.query<RecentProject>(
      `select p.id, p.title, p.status::text as status, p.is_favorite, p.updated_at,
              (select count(*)
                 from public.knowledge_documents d
                 join public.knowledge_bases b on b.id = d.knowledge_base_id
                where b.project_id = p.id
                  and d.status <> 'deleted'::record_status)::int as document_count
         from public.projects p
         join public.workspaces w on w.id = p.workspace_id
        where w.organization_id = $1 and p.is_archived = false
        order by p.is_favorite desc, p.updated_at desc
        limit $2`,
      [tenant.organizationId, limit],
    );
    return rows;
  }

  async recentResearch(tenant: TenantContext, limit = 5): Promise<RecentResearch[]> {
    const { rows } = await this.pool.query<RecentResearch>(
      `select s.id, s.title, s.depth::text as depth,
              p.title as project_title,
              (select rr.confidence_score from public.research_results rr
                where rr.session_id = s.id order by rr.created_at desc limit 1)
                as confidence_score,
              s.created_at
         from public.research_sessions s
         join public.projects p on p.id = s.project_id
         join public.workspaces w on w.id = p.workspace_id
        where w.organization_id = $1 and s.status = 'active'::record_status
        order by s.created_at desc
        limit $2`,
      [tenant.organizationId, limit],
    );
    return rows.map((r) => ({
      ...r,
      confidence_score: r.confidence_score === null ? null : Number(r.confidence_score),
    }));
  }

  async recentConversations(tenant: TenantContext, limit = 5): Promise<RecentConversation[]> {
    const { rows } = await this.pool.query<RecentConversation>(
      `select id, title, total_messages, updated_at
         from public.ai_conversations
        where user_id = $1 and is_archived = false
        order by updated_at desc
        limit $2`,
      [tenant.userId, limit],
    );
    return rows;
  }

  async recentActivity(tenant: TenantContext, limit = 8): Promise<ActivityEvent[]> {
    const { rows } = await this.pool.query<ActivityEvent>(
      `select action, resource_type, created_at
         from public.audit_events
        where organization_id = $1
        order by created_at desc
        limit $2`,
      [tenant.organizationId, limit],
    );
    return rows;
  }

  /** This week against last, so the number has something to mean. */
  async weeklyProgress(tenant: TenantContext): Promise<WeeklyProgress> {
    const { rows } = await this.pool.query<WeeklyProgress>(
      `select
         (select count(*) from public.research_sessions s
            join public.projects p on p.id = s.project_id
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1
             and s.status = 'active'::record_status
             and s.created_at >= now() - interval '7 days')::int
           as research_this_week,
         (select count(*) from public.research_sessions s
            join public.projects p on p.id = s.project_id
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1
             and s.status = 'active'::record_status
             and s.created_at >= now() - interval '14 days'
             and s.created_at <  now() - interval '7 days')::int
           as research_last_week,
         (select count(*) from public.ai_messages m
            join public.ai_conversations c on c.id = m.conversation_id
           where c.user_id = $2 and m.created_at >= now() - interval '7 days')::int
           as messages_this_week,
         (select count(*) from public.knowledge_documents d
            join public.knowledge_bases kb on kb.id = d.knowledge_base_id
            join public.projects p on p.id = kb.project_id
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1
             and d.status <> 'deleted'::record_status
             and d.created_at >= now() - interval '7 days')::int
           as documents_this_week`,
      [tenant.organizationId, tenant.userId],
    );
    return rows[0]!;
  }

  async credits(tenant: TenantContext) {
    const { rows } = await this.pool.query<{ available: number; used: number }>(
      `select coalesce(available_credits, 0)::int as available,
              coalesce(used_credits, 0)::int as used
         from public.ai_credit_balances where organization_id = $1`,
      [tenant.organizationId],
    );
    return rows[0] ?? { available: 0, used: 0 };
  }

  /**
   * Headline counters with a month-on-month comparison.
   *
   * Every number here is something the product actually recorded. There is no
   * "hours saved" metric because we have no honest way to measure it — a
   * figure invented from assumed multipliers would look impressive on the
   * dashboard and mean nothing to the person reading it.
   */
  async stats(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `with scoped as (
         select p.id
           from public.projects p
           join public.workspaces w on w.id = p.workspace_id
          where w.organization_id = $1 and p.is_archived = false
       )
       select
         (select count(*) from scoped)::int as projects,
         (select count(*) from public.projects p
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1 and p.is_archived = false
             and p.created_at >= date_trunc('month', now()))::int as projects_this_month,
         (select count(*) from public.projects p
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1 and p.is_archived = false
             and p.created_at >= date_trunc('month', now()) - interval '1 month'
             and p.created_at <  date_trunc('month', now()))::int as projects_last_month,

         (select count(*) from public.knowledge_documents d
            join public.knowledge_bases b on b.id = d.knowledge_base_id
           where b.project_id in (select id from scoped)
             and d.status <> 'deleted'::record_status)::int as documents,

         (select count(*) from public.ai_requests r
           where r.organization_id = $1 and r.success = true)::int as ai_requests,

         (select coalesce(sum(t.amount), 0)::int
            from public.ai_credit_transactions t
           where t.organization_id = $1
             and t.transaction_type = 'usage'
             and t.created_at >= date_trunc('month', now()))::int as credits_this_month,
         (select coalesce(sum(t.amount), 0)::int
            from public.ai_credit_transactions t
           where t.organization_id = $1
             and t.transaction_type = 'usage'
             and t.created_at >= date_trunc('month', now()) - interval '1 month'
             and t.created_at <  date_trunc('month', now()))::int as credits_last_month,

         (select (
            (select count(*) from public.research_sessions s
              where s.project_id in (select id from scoped)
                and s.status = 'active'::record_status) +
            (select count(*) from public.outlines o
              where o.project_id in (select id from scoped)) +
            (select count(*) from public.scripts sc
              where sc.project_id in (select id from scoped))
          ))::int as content_created`,
      [tenant.organizationId],
    );
    return rows[0]!;
  }

  /** Daily credit spend for the chart. Gaps are filled so the line is continuous. */
  async creditSeries(tenant: TenantContext, days = 30) {
    const { rows } = await this.pool.query<{ day: string; credits: number }>(
      `select d.day::date as day,
              coalesce(sum(t.amount), 0)::int as credits
         from generate_series(
                date_trunc('day', now()) - (($2 - 1) || ' days')::interval,
                date_trunc('day', now()),
                interval '1 day'
              ) as d(day)
         left join public.ai_credit_transactions t
                on date_trunc('day', t.created_at) = d.day
               and t.organization_id = $1
               and t.transaction_type = 'usage'
        group by d.day
        order by d.day`,
      [tenant.organizationId, days],
    );
    return rows;
  }

  /** The plan's credit allowance, so the balance can be shown as a proportion. */
  async creditAllowance(tenant: TenantContext) {
    const { rows } = await this.pool.query<{
      ai_credits: number | null;
      plan_name: string | null;
      period_end: string | null;
    }>(
      `select pl.ai_credits, pl.name as plan_name, s.current_period_end as period_end
         from public.organization_subscriptions s
         join public.subscription_plans pl on pl.id = s.plan_id
        where s.organization_id = $1
        limit 1`,
      [tenant.organizationId],
    );
    return rows[0] ?? { ai_credits: null, plan_name: null, period_end: null };
  }
}
