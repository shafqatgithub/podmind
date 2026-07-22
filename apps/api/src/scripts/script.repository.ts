import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface ScriptRow {
  id: string;
  project_id: string;
  outline_id: string | null;
  title: string;
  description: string | null;
  script_style: string;
  content: string | null;
  word_count: number | null;
  estimated_duration_minutes: number | null;
  language: string;
  tone: string;
  ai_provider: string | null;
  version: number;
  status: string;
  is_current: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ScriptSectionRow {
  id: string;
  title: string | null;
  speaker: string | null;
  content: string;
  notes: string | null;
  duration_seconds: number | null;
  sort_order: number;
}

const SCRIPT_COLUMNS = `s.id, s.project_id, s.outline_id, s.title, s.description,
  s.script_style::text as script_style, s.content, s.word_count,
  s.estimated_duration_minutes, s.language::text as language, s.tone::text as tone,
  s.ai_provider::text as ai_provider, s.version, s.status::text as status,
  s.is_current, s.metadata, s.created_at, s.updated_at`;

@Injectable()
export class ScriptRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    s.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async findProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.language::text as language
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
      language: string;
    };
  }

  /** The outline to write from, with its sections in running order. */
  async findOutlineForScript(tenant: TenantContext, outlineId: string) {
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      outline_type: string;
      metadata: Record<string, unknown> | null;
    }>(
      `select o.id, o.title, o.outline_type::text as outline_type, o.metadata
         from public.outlines o
         join public.projects p on p.id = o.project_id
         join public.workspaces w on w.id = p.workspace_id
        where o.id = $2 and w.organization_id = $1`,
      [tenant.organizationId, outlineId],
    );
    const outline = rows[0];
    if (!outline) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Outline not found" });
    }

    const sections = await this.pool.query<{
      title: string;
      description: string | null;
      estimated_minutes: number | null;
      talking_points: unknown;
    }>(
      `select title, description, estimated_minutes, talking_points
         from public.outline_sections
        where outline_id = $1
        order by sort_order asc`,
      [outlineId],
    );

    return { ...outline, sections: sections.rows };
  }

  /**
   * Store the script and its sections atomically, retiring the previous
   * current script for the project in the same transaction.
   */
  async saveScript(input: {
    tenant: TenantContext;
    projectId: string;
    outlineId: string | null;
    title: string;
    description: string | null;
    style: string;
    tone: string;
    language: string;
    provider: string;
    content: string;
    wordCount: number;
    estimatedMinutes: number;
    metadata: Record<string, unknown>;
    sections: {
      title: string | null;
      speaker: string | null;
      content: string;
      notes: string | null;
      durationSeconds: number | null;
    }[];
  }): Promise<ScriptRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const previous = await client.query<{ version: number }>(
        `select coalesce(max(version), 0) as version from public.scripts where project_id = $1`,
        [input.projectId],
      );
      const version = Number(previous.rows[0]?.version ?? 0) + 1;

      await client.query(
        `update public.scripts set is_current = false, updated_at = now()
          where project_id = $1 and is_current = true`,
        [input.projectId],
      );

      const { rows } = await client.query<ScriptRow>(
        `insert into public.scripts
           (project_id, outline_id, created_by, title, description, script_style,
            content, word_count, estimated_duration_minutes, language, tone,
            ai_provider, version, is_current, metadata)
         values ($1,$2,$3,$4,$5,$6::script_style,$7,$8,$9,$10::language_code,
                 $11::content_tone,$12::ai_provider,$13,true,$14)
         returning id, project_id, outline_id, title, description,
                   script_style::text as script_style, content, word_count,
                   estimated_duration_minutes, language::text as language,
                   tone::text as tone, ai_provider::text as ai_provider, version,
                   status::text as status, is_current, metadata, created_at, updated_at`,
        [
          input.projectId,
          input.outlineId,
          input.tenant.userId,
          input.title,
          input.description,
          input.style,
          input.content,
          input.wordCount,
          input.estimatedMinutes,
          input.language,
          input.tone,
          input.provider,
          version,
          JSON.stringify(input.metadata),
        ],
      );
      const script = rows[0]!;

      for (const [index, section] of input.sections.entries()) {
        await client.query(
          `insert into public.script_sections
             (script_id, title, speaker, content, notes, duration_seconds, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7)`,
          [
            script.id,
            section.title,
            section.speaker,
            section.content,
            section.notes,
            section.durationSeconds,
            index,
          ],
        );
      }

      await client.query("commit");
      return script;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string): Promise<ScriptRow[]> {
    const params: unknown[] = [tenant.organizationId];
    let where = ScriptRepository.TENANT_SCOPE;
    if (projectId) {
      params.push(projectId);
      where += ` and s.project_id = $${params.length}`;
    }
    const { rows } = await this.pool.query<ScriptRow>(
      `select ${SCRIPT_COLUMNS} from public.scripts s
        where ${where}
        order by s.created_at desc
        limit 50`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<ScriptRow>(
      `select ${SCRIPT_COLUMNS} from public.scripts s
        where ${ScriptRepository.TENANT_SCOPE} and s.id = $2`,
      [tenant.organizationId, id],
    );
    const script = rows[0];
    if (!script) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Script not found" });
    }

    const sections = await this.pool.query<ScriptSectionRow>(
      `select id, title, speaker, content, notes, duration_seconds, sort_order
         from public.script_sections
        where script_id = $1
        order by sort_order asc`,
      [id],
    );
    return { ...script, sections: sections.rows };
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.scripts where id = $1`, [id]);
  }
}
