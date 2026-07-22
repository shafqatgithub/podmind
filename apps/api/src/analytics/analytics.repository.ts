import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface UsagePoint {
  day: string;
  requests: number;
  tokens: number;
  credits: number;
  cost: number;
}

export interface ProviderUsage {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
}

export interface TaskUsage {
  task: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface Totals {
  requests: number;
  successes: number;
  failures: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
  credits_available: number;
  credits_used: number;
  projects: number;
  research_sessions: number;
  conversations: number;
  knowledge_documents: number;
}

export interface FailureRow {
  created_at: string;
  provider: string | null;
  task: string;
  error_message: string | null;
}

/**
 * Analytics repository.
 *
 * Every figure is derived from data the platform already records — the
 * ai_requests telemetry the Router writes on every attempt, the credit
 * ledger, and the content tables. Analytics therefore has no write path of
 * its own and cannot disagree with what actually happened.
 */
@Injectable()
export class AnalyticsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async totals(tenant: TenantContext, days: number): Promise<Totals> {
    const { rows } = await this.pool.query<Totals>(
      `select
         coalesce(agg.requests, 0)::int               as requests,
         coalesce(agg.successes, 0)::int              as successes,
         coalesce(agg.failures, 0)::int               as failures,
         coalesce(agg.tokens, 0)::int                 as tokens,
         coalesce(agg.cost, 0)::float                 as cost,
         coalesce(agg.avg_latency_ms, 0)::int         as avg_latency_ms,
         coalesce(bal.available_credits, 0)::int      as credits_available,
         coalesce(bal.used_credits, 0)::int           as credits_used,
         coalesce(counts.projects, 0)::int            as projects,
         coalesce(counts.research_sessions, 0)::int   as research_sessions,
         coalesce(counts.conversations, 0)::int       as conversations,
         coalesce(counts.knowledge_documents, 0)::int as knowledge_documents
       from (
         select count(*) as requests,
                count(*) filter (where r.success) as successes,
                count(*) filter (where not r.success) as failures,
                sum(coalesce(r.total_tokens, 0)) as tokens,
                sum(coalesce(r.estimated_cost, 0)) as cost,
                avg(r.latency_ms) filter (where r.success) as avg_latency_ms
           from public.ai_requests r
          where r.organization_id = $1
            and r.created_at >= now() - ($2 || ' days')::interval
       ) agg
       left join lateral (
         select available_credits, used_credits
           from public.ai_credit_balances where organization_id = $1
       ) bal on true
       left join lateral (
         select
           (select count(*) from public.projects p
             join public.workspaces w on w.id = p.workspace_id
            where w.organization_id = $1) as projects,
           (select count(*) from public.research_sessions s
             join public.projects p on p.id = s.project_id
             join public.workspaces w on w.id = p.workspace_id
            where w.organization_id = $1
              and s.status <> 'deleted'::record_status) as research_sessions,
           (select count(*) from public.ai_conversations c
            where c.user_id = $3) as conversations,
           (select count(*) from public.knowledge_documents d
             join public.knowledge_bases kb on kb.id = d.knowledge_base_id
             join public.projects p on p.id = kb.project_id
             join public.workspaces w on w.id = p.workspace_id
            where w.organization_id = $1
              and d.status <> 'deleted'::record_status) as knowledge_documents
       ) counts on true`,
      [tenant.organizationId, String(days), tenant.userId],
    );
    return rows[0]!;
  }

  /** Daily series with empty days filled, so a chart has no gaps. */
  async dailyUsage(tenant: TenantContext, days: number): Promise<UsagePoint[]> {
    const { rows } = await this.pool.query<UsagePoint>(
      `with span as (
         select generate_series(
           (now() - ($2 || ' days')::interval)::date, now()::date, interval '1 day'
         )::date as day
       ),
       requests as (
         select r.created_at::date as day,
                count(*) as requests,
                sum(coalesce(r.total_tokens, 0)) as tokens,
                sum(coalesce(r.estimated_cost, 0)) as cost
           from public.ai_requests r
          where r.organization_id = $1
            and r.created_at >= now() - ($2 || ' days')::interval
          group by 1
       ),
       spend as (
         select t.created_at::date as day, sum(t.amount) as credits
           from public.ai_credit_transactions t
          where t.organization_id = $1
            and t.transaction_type = 'usage'
            and t.created_at >= now() - ($2 || ' days')::interval
          group by 1
       )
       select to_char(span.day, 'YYYY-MM-DD') as day,
              coalesce(requests.requests, 0)::int as requests,
              coalesce(requests.tokens, 0)::int   as tokens,
              coalesce(spend.credits, 0)::int     as credits,
              coalesce(requests.cost, 0)::float   as cost
         from span
         left join requests on requests.day = span.day
         left join spend on spend.day = span.day
        order by span.day asc`,
      [tenant.organizationId, String(days)],
    );
    return rows;
  }

  async byProvider(tenant: TenantContext, days: number): Promise<ProviderUsage[]> {
    const { rows } = await this.pool.query<ProviderUsage>(
      `select coalesce(p.provider_type::text, 'unknown') as provider,
              count(*)::int as requests,
              count(*) filter (where r.success)::int as successes,
              count(*) filter (where not r.success)::int as failures,
              coalesce(sum(r.total_tokens), 0)::int as tokens,
              coalesce(sum(r.estimated_cost), 0)::float as cost,
              coalesce(avg(r.latency_ms) filter (where r.success), 0)::int as avg_latency_ms
         from public.ai_requests r
         left join public.ai_providers p on p.id = r.provider_id
        where r.organization_id = $1
          and r.created_at >= now() - ($2 || ' days')::interval
        group by 1
        order by requests desc`,
      [tenant.organizationId, String(days)],
    );
    return rows;
  }

  async byTask(tenant: TenantContext, days: number): Promise<TaskUsage[]> {
    const { rows } = await this.pool.query<TaskUsage>(
      `select r.task::text as task,
              count(*)::int as requests,
              coalesce(sum(r.total_tokens), 0)::int as tokens,
              coalesce(sum(r.estimated_cost), 0)::float as cost
         from public.ai_requests r
        where r.organization_id = $1
          and r.created_at >= now() - ($2 || ' days')::interval
        group by 1
        order by requests desc`,
      [tenant.organizationId, String(days)],
    );
    return rows;
  }

  /** Recent failures, so a rejected key or exhausted quota is visible. */
  async recentFailures(tenant: TenantContext, limit = 5): Promise<FailureRow[]> {
    const { rows } = await this.pool.query<FailureRow>(
      `select r.created_at, p.provider_type::text as provider,
              r.task::text as task, r.error_message
         from public.ai_requests r
         left join public.ai_providers p on p.id = r.provider_id
        where r.organization_id = $1 and not r.success
        order by r.created_at desc
        limit $2`,
      [tenant.organizationId, limit],
    );
    return rows;
  }
}
