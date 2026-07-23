import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { PipelineStep } from "./dto/agent.dto";

export interface AgentSessionRow {
  id: string;
  project_id: string;
  session_name: string;
  status: string;
  metadata: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface AgentTaskRow {
  id: string;
  session_id: string;
  task_name: string;
  task_type: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

@Injectable()
export class AgentRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    s.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.language::text as language
         from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return rows[0] as { id: string; title: string; language: string };
  }

  /** Agents are catalogue rows; the pipeline maps a step onto one. */
  async agentIdBySlug(): Promise<Map<string, string>> {
    const { rows } = await this.pool.query<{ slug: string; id: string }>(
      `select slug::text as slug, id from public.ai_agents where is_active = true`,
    );
    return new Map(rows.map((r) => [r.slug, r.id]));
  }

  async createSession(
    tenant: TenantContext,
    input: { projectId: string; name: string; metadata: Record<string, unknown> },
  ): Promise<AgentSessionRow> {
    const { rows } = await this.pool.query<AgentSessionRow>(
      `insert into public.ai_agent_sessions
         (project_id, started_by, session_name, status, metadata)
       values ($1,$2,$3,'running',$4)
       returning id, project_id, session_name, status, metadata, started_at, completed_at`,
      [input.projectId, tenant.userId, input.name, JSON.stringify(input.metadata)],
    );
    return rows[0]!;
  }

  async createTask(input: {
    sessionId: string;
    agentId: string | null;
    name: string;
    type: PipelineStep;
    priority: number;
  }): Promise<AgentTaskRow> {
    const { rows } = await this.pool.query<AgentTaskRow>(
      `insert into public.ai_agent_tasks
         (session_id, agent_id, task_name, task_type, priority, status)
       values ($1,$2,$3,$4::ai_task,$5,'queued')
       returning id, session_id, task_name, task_type::text as task_type, status,
                 input, output, execution_time_ms, error_message, created_at, completed_at`,
      [input.sessionId, input.agentId, input.name, input.type, input.priority],
    );
    return rows[0]!;
  }

  async startTask(taskId: string): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_tasks set status = 'running' where id = $1`,
      [taskId],
    );
  }

  async completeTask(
    taskId: string,
    output: Record<string, unknown>,
    ms: number,
  ): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_tasks
          set status = 'completed', output = $2, execution_time_ms = $3, completed_at = now()
        where id = $1`,
      [taskId, JSON.stringify(output), ms],
    );
  }

  async failTask(taskId: string, message: string, ms: number): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_tasks
          set status = 'failed', error_message = $2, execution_time_ms = $3, completed_at = now()
        where id = $1`,
      [taskId, message.slice(0, 1000), ms],
    );
  }

  async skipTask(taskId: string, reason: string): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_tasks
          set status = 'skipped', error_message = $2, completed_at = now()
        where id = $1`,
      [taskId, reason.slice(0, 1000)],
    );
  }

  async finishSession(
    sessionId: string,
    status: "completed" | "partial" | "failed",
  ): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_sessions
          set status = $2, completed_at = now()
        where id = $1`,
      [sessionId, status],
    );
  }

  async log(
    executionOrSession: string,
    taskId: string | null,
    level: "info" | "warn" | "error",
    message: string,
  ): Promise<void> {
    // ai_agent_logs.execution_id references an execution row; sessions without
    // one still deserve a trail, so the session id is recorded in metadata.
    await this.pool.query(
      `insert into public.ai_agent_logs (execution_id, task_id, level, message, metadata)
       values (null, $2, $3, $4, jsonb_build_object('session_id', $1::text))`,
      [executionOrSession, taskId, level, message.slice(0, 2000)],
    );
  }

  async list(tenant: TenantContext, projectId?: string, limit = 20) {
    const params: unknown[] = [tenant.organizationId];
    const where = [AgentRepository.TENANT_SCOPE];
    if (projectId) {
      params.push(projectId);
      where.push(`s.project_id = $${params.length}`);
    }
    params.push(limit);

    const { rows } = await this.pool.query(
      `select s.id, s.project_id, s.session_name, s.status, s.metadata,
              s.started_at, s.completed_at,
              (select count(*) from public.ai_agent_tasks t where t.session_id = s.id) as total_tasks,
              (select count(*) from public.ai_agent_tasks t
                where t.session_id = s.id and t.status = 'completed') as completed_tasks
         from public.ai_agent_sessions s
        where ${where.join(" and ")}
        order by s.started_at desc
        limit $${params.length}`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<AgentSessionRow>(
      `select s.id, s.project_id, s.session_name, s.status, s.metadata,
              s.started_at, s.completed_at
         from public.ai_agent_sessions s
        where ${AgentRepository.TENANT_SCOPE} and s.id = $2`,
      [tenant.organizationId, id],
    );
    const session = rows[0];
    if (!session) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Agent run not found" });
    }

    const tasks = await this.pool.query<AgentTaskRow>(
      `select id, session_id, task_name, task_type::text as task_type, status,
              input, output, execution_time_ms, error_message, created_at, completed_at
         from public.ai_agent_tasks
        where session_id = $1
        order by priority asc, created_at asc`,
      [id],
    );

    return { ...session, tasks: tasks.rows };
  }

  async listAgents() {
    const { rows } = await this.pool.query(
      `select id, slug::text as slug, name, description, role, icon
         from public.ai_agents
        where is_active = true
        order by name`,
    );
    return rows;
  }

  /**
   * A run executes in this process, so a container restart can leave tasks
   * stuck in `running` forever. Anything older than the cutoff is reported as
   * failed rather than shown as a spinner that never resolves.
   */
  async reapStaleRuns(olderThanMinutes = 20): Promise<void> {
    await this.pool.query(
      `update public.ai_agent_tasks
          set status = 'failed',
              error_message = 'Interrupted — the server restarted while this step was running',
              completed_at = now()
        where status in ('queued','running')
          and created_at < now() - ($1 || ' minutes')::interval`,
      [olderThanMinutes],
    );
    await this.pool.query(
      `update public.ai_agent_sessions
          set status = 'failed', completed_at = now()
        where status = 'running'
          and started_at < now() - ($1 || ' minutes')::interval`,
      [olderThanMinutes],
    );
  }
}
