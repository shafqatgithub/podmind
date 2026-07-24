import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface CalendarEntry {
  id: string;
  project_id: string;
  title: string;
  topic: string | null;
  notes: string | null;
  scheduled_for: string;
  publish_at: string | null;
  guest_id: string | null;
  guest_name: string | null;
  agent_session_id: string | null;
  agent_status: string | null;
  status: string;
}

const COLUMNS = `c.id, c.project_id, c.title, c.topic, c.notes,
                 c.scheduled_for, c.publish_at, c.guest_id, c.agent_session_id, c.status,
                 g.full_name as guest_name,
                 s.status as agent_status`;

const JOINS = `left join public.guests g on g.id = c.guest_id
               left join public.ai_agent_sessions s on s.id = c.agent_session_id`;

@Injectable()
export class CalendarRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    c.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `select 1 from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
  }

  async list(
    tenant: TenantContext,
    query: { projectId?: string; from?: string; to?: string },
  ): Promise<CalendarEntry[]> {
    const params: unknown[] = [tenant.organizationId];
    const where = [CalendarRepository.TENANT_SCOPE];

    if (query.projectId) {
      params.push(query.projectId);
      where.push(`c.project_id = $${params.length}`);
    }
    if (query.from) {
      params.push(query.from);
      where.push(`c.scheduled_for >= $${params.length}::date`);
    }
    if (query.to) {
      params.push(query.to);
      where.push(`c.scheduled_for <= $${params.length}::date`);
    }

    const { rows } = await this.pool.query<CalendarEntry>(
      `select ${COLUMNS}
         from public.content_calendar c
         ${JOINS}
        where ${where.join(" and ")}
        order by c.scheduled_for, c.sort_order`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string): Promise<CalendarEntry> {
    const { rows } = await this.pool.query<CalendarEntry>(
      `select ${COLUMNS}
         from public.content_calendar c
         ${JOINS}
        where ${CalendarRepository.TENANT_SCOPE} and c.id = $2`,
      [tenant.organizationId, id],
    );
    const entry = rows[0];
    if (!entry) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Calendar entry not found" });
    }
    return entry;
  }

  async create(
    tenant: TenantContext,
    input: {
      projectId: string;
      title: string;
      topic: string | null;
      notes: string | null;
      scheduledFor: string;
      publishAt: string | null;
      guestId: string | null;
    },
  ): Promise<CalendarEntry> {
    const { rows } = await this.pool.query<{ id: string }>(
      `insert into public.content_calendar
         (project_id, created_by, title, topic, notes, scheduled_for, publish_at, guest_id)
       values ($1,$2,$3,$4,$5,$6::date,$7::date,$8)
       returning id`,
      [
        input.projectId,
        tenant.userId,
        input.title,
        input.topic,
        input.notes,
        input.scheduledFor,
        input.publishAt,
        input.guestId,
      ],
    );
    return this.findOne(tenant, rows[0]!.id);
  }

  /** A planned run either lands whole or not at all. */
  async createMany(
    tenant: TenantContext,
    projectId: string,
    entries: {
      title: string;
      topic: string | null;
      scheduledFor: string;
      publishAt: string | null;
    }[],
  ): Promise<number> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");
      for (const [index, entry] of entries.entries()) {
        await client.query(
          `insert into public.content_calendar
             (project_id, created_by, title, topic, scheduled_for, publish_at, sort_order)
           values ($1,$2,$3,$4,$5::date,$6::date,$7)`,
          [
            projectId,
            tenant.userId,
            entry.title,
            entry.topic,
            entry.scheduledFor,
            entry.publishAt,
            index,
          ],
        );
      }
      await client.query("commit");
      return entries.length;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Updates are built from a whitelist, never from the request object. */
  async update(
    tenant: TenantContext,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<CalendarEntry> {
    await this.findOne(tenant, id);

    const sets: string[] = [];
    const params: unknown[] = [id];

    for (const field of ["title", "topic", "notes", "status"] as const) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    for (const field of ["scheduled_for", "publish_at"] as const) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}::date`);
      }
    }
    if (patch.guest_id !== undefined) {
      params.push(patch.guest_id);
      sets.push(`guest_id = $${params.length}`);
    }

    if (sets.length > 0) {
      await this.pool.query(
        `update public.content_calendar set ${sets.join(", ")} where id = $1`,
        params,
      );
    }
    return this.findOne(tenant, id);
  }

  /** Records which pipeline run belongs to a planned slot. */
  async attachSession(tenant: TenantContext, id: string, sessionId: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(
      `update public.content_calendar
          set agent_session_id = $2, status = 'researching'
        where id = $1`,
      [id, sessionId],
    );
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.content_calendar where id = $1`, [id]);
  }
}
