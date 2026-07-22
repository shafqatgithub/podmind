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
      `select p.id, p.title, p.status::text as status, p.is_favorite, p.updated_at
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
}
