import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface OutlineRow {
  id: string;
  project_id: string;
  research_session_id: string | null;
  title: string;
  description: string | null;
  outline_type: string;
  ai_provider: string | null;
  status: string;
  estimated_duration_minutes: number | null;
  version: number;
  is_current: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  estimated_minutes: number | null;
  talking_points: unknown;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

const OUTLINE_COLUMNS = `o.id, o.project_id, o.research_session_id, o.title, o.description,
  o.outline_type::text as outline_type, o.ai_provider::text as ai_provider,
  o.status::text as status, o.estimated_duration_minutes, o.version, o.is_current,
  o.metadata, o.created_at, o.updated_at`;

/**
 * Outline repository.
 *
 * Tenant scope is the usual chain: outline -> project -> workspace ->
 * organization.
 */
@Injectable()
export class OutlineRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    o.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async findProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.niche,
              p.language::text as language
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
    return rows[0] as {
      id: string;
      title: string;
      podcast_name: string | null;
      audience: string | null;
      niche: string | null;
      language: string;
    };
  }

  /** Research to build the outline on, if the caller pointed at a session. */
  async findResearchForOutline(tenant: TenantContext, sessionId: string) {
    const { rows } = await this.pool.query<{
      summary: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `select rr.summary, rr.metadata
         from public.research_results rr
         join public.research_sessions rs on rs.id = rr.session_id
         join public.projects p on p.id = rs.project_id
         join public.workspaces w on w.id = p.workspace_id
        where rs.id = $2 and w.organization_id = $1
        order by rr.created_at desc
        limit 1`,
      [tenant.organizationId, sessionId],
    );
    if (!rows[0]) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Research session not found",
      });
    }
    return rows[0];
  }

  /**
   * Persist an outline with its sections and talking points atomically, and
   * retire any previous current outline for the project in the same
   * transaction — two "current" outlines would make every downstream
   * consumer pick arbitrarily.
   */
  async saveOutline(input: {
    tenant: TenantContext;
    projectId: string;
    researchSessionId: string | null;
    title: string;
    description: string | null;
    style: string;
    provider: string;
    estimatedMinutes: number | null;
    metadata: Record<string, unknown>;
    sections: {
      title: string;
      description: string | null;
      estimatedMinutes: number | null;
      talkingPoints: string[];
      transition: string | null;
    }[];
    questions: string[];
  }): Promise<OutlineRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const previous = await client.query<{ version: number }>(
        `select coalesce(max(version), 0) as version
           from public.outlines where project_id = $1`,
        [input.projectId],
      );
      const version = Number(previous.rows[0]?.version ?? 0) + 1;

      await client.query(
        `update public.outlines set is_current = false, updated_at = now()
          where project_id = $1 and is_current = true`,
        [input.projectId],
      );

      const { rows } = await client.query<OutlineRow>(
        `insert into public.outlines
           (project_id, research_session_id, created_by, title, description,
            outline_type, ai_provider, estimated_duration_minutes, version,
            is_current, metadata)
         values ($1,$2,$3,$4,$5,$6::script_style,$7::ai_provider,$8,$9,true,$10)
         returning id, project_id, research_session_id, title, description,
                   outline_type::text as outline_type, ai_provider::text as ai_provider,
                   status::text as status, estimated_duration_minutes, version,
                   is_current, metadata, created_at, updated_at`,
        [
          input.projectId,
          input.researchSessionId,
          input.tenant.userId,
          input.title,
          input.description,
          input.style,
          input.provider,
          input.estimatedMinutes,
          version,
          JSON.stringify(input.metadata),
        ],
      );
      const outline = rows[0]!;

      for (const [index, section] of input.sections.entries()) {
        const sectionRow = await client.query<{ id: string }>(
          `insert into public.outline_sections
             (outline_id, title, description, sort_order, estimated_minutes,
              talking_points, metadata)
           values ($1,$2,$3,$4,$5,$6,$7)
           returning id`,
          [
            outline.id,
            section.title,
            section.description,
            index,
            section.estimatedMinutes,
            JSON.stringify(section.talkingPoints),
            JSON.stringify({ transition: section.transition }),
          ],
        );

        // Talking points are also stored as rows so they can be edited,
        // reordered and regenerated individually later.
        for (const [pointIndex, content] of section.talkingPoints.entries()) {
          await client.query(
            `insert into public.outline_talking_points
               (section_id, content, sort_order, ai_generated)
             values ($1, $2, $3, true)`,
            [sectionRow.rows[0]!.id, content, pointIndex],
          );
        }
      }

      for (const [index, question] of input.questions.entries()) {
        await client.query(
          `insert into public.outline_questions (outline_id, question, priority, ai_generated)
           values ($1, $2, $3, true)`,
          [outline.id, question, index],
        );
      }

      await client.query("commit");
      return outline;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string): Promise<OutlineRow[]> {
    const params: unknown[] = [tenant.organizationId];
    let where = OutlineRepository.TENANT_SCOPE;
    if (projectId) {
      params.push(projectId);
      where += ` and o.project_id = $${params.length}`;
    }
    const { rows } = await this.pool.query<OutlineRow>(
      `select ${OUTLINE_COLUMNS}
         from public.outlines o
        where ${where}
        order by o.created_at desc
        limit 50`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<OutlineRow>(
      `select ${OUTLINE_COLUMNS}
         from public.outlines o
        where ${OutlineRepository.TENANT_SCOPE} and o.id = $2`,
      [tenant.organizationId, id],
    );
    const outline = rows[0];
    if (!outline) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Outline not found" });
    }

    const sections = await this.pool.query<SectionRow>(
      `select id, title, description, sort_order, estimated_minutes,
              talking_points, notes, metadata
         from public.outline_sections
        where outline_id = $1
        order by sort_order asc`,
      [id],
    );
    const questions = await this.pool.query<{ id: string; question: string }>(
      `select id, question from public.outline_questions
        where outline_id = $1 order by priority asc`,
      [id],
    );

    return { ...outline, sections: sections.rows, questions: questions.rows };
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.outlines where id = $1`, [id]);
  }
}
