import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { ListResearchQueryDto } from "./dto/research.dto";

export interface ResearchSessionRow {
  id: string;
  project_id: string;
  created_by: string;
  title: string;
  topic: string;
  objective: string | null;
  depth: string;
  status: string;
  ai_provider: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchResultRow {
  id: string;
  session_id: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  confidence_score: string | number | null;
  token_usage: number | null;
  processing_time_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ResearchSourceRow {
  id: string;
  title: string | null;
  url: string | null;
  author: string | null;
  source_type: string | null;
  credibility_score: string | number | null;
}

export interface ResearchQuestionRow {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

const SESSION_COLUMNS = `id, project_id, created_by, title, topic, objective,
                         depth::text as depth, status::text as status,
                         ai_provider::text as ai_provider, metadata,
                         created_at, updated_at`;

/** Same columns qualified for queries that alias research_sessions as `s`. */
const SESSION_COLUMNS_S = `s.id, s.project_id, s.created_by, s.title, s.topic, s.objective,
                           s.depth::text as depth, s.status::text as status,
                           s.ai_provider::text as ai_provider, s.metadata,
                           s.created_at, s.updated_at`;

/**
 * Research repository — the only place research SQL lives.
 *
 * Tenant safety mirrors Projects: every statement reaches the session through
 * its project and that project's workspace, which must belong to the caller's
 * organization. A forged id from another tenant matches no row.
 */
@Injectable()
export class ResearchRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Sessions reachable by this organization. */
  private static readonly TENANT_SCOPE = `
    s.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  /** Confirms the project belongs to the tenant before spending credits. */
  async assertProjectInTenant(
    tenant: TenantContext,
    projectId: string,
  ): Promise<{
    id: string;
    title: string;
    podcast_name: string | null;
    audience: string | null;
    niche: string | null;
    language: string;
  }> {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.niche, p.language::text as language
         from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    const project = rows[0];
    if (!project) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return project as {
      id: string;
      title: string;
      podcast_name: string | null;
      audience: string | null;
      niche: string | null;
      language: string;
    };
  }

  async createSession(
    tenant: TenantContext,
    input: {
      projectId: string;
      title: string;
      topic: string;
      objective?: string | null;
      depth: string;
    },
  ): Promise<ResearchSessionRow> {
    const { rows } = await this.pool.query<ResearchSessionRow>(
      `insert into public.research_sessions
         (project_id, created_by, title, topic, objective, depth)
       values ($1, $2, $3, $4, $5, $6::research_depth)
       returning ${SESSION_COLUMNS}`,
      [
        input.projectId,
        tenant.userId,
        input.title,
        input.topic,
        input.objective ?? null,
        input.depth,
      ],
    );
    return rows[0]!;
  }

  /**
   * Persist the AI output atomically: the result row plus its sources and
   * suggested follow-up questions either all land or none do, so a session
   * is never left half-populated.
   */
  async saveResult(input: {
    sessionId: string;
    aiProvider: string;
    result: {
      title: string | null;
      summary: string | null;
      content: string;
      confidenceScore: number | null;
      tokenUsage: number;
      processingTimeMs: number;
      metadata: Record<string, unknown>;
    };
    sources: {
      title: string | null;
      url: string | null;
      author: string | null;
      sourceType: string | null;
      credibility: number | null;
    }[];
    followUpQuestions: string[];
  }): Promise<ResearchResultRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<ResearchResultRow>(
        `insert into public.research_results
           (session_id, ai_agent, title, summary, content, confidence_score,
            token_usage, processing_time_ms, metadata)
         values ($1, 'research'::ai_agent, $2, $3, $4, $5, $6, $7, $8)
         returning id, session_id, title, summary, content, confidence_score,
                   token_usage, processing_time_ms, metadata, created_at`,
        [
          input.sessionId,
          input.result.title,
          input.result.summary,
          input.result.content,
          input.result.confidenceScore,
          input.result.tokenUsage,
          input.result.processingTimeMs,
          JSON.stringify(input.result.metadata),
        ],
      );
      const result = rows[0]!;

      for (const source of input.sources) {
        await client.query(
          `insert into public.research_sources
             (result_id, title, url, author, source_type, credibility_score)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            result.id,
            source.title,
            source.url,
            source.author,
            source.sourceType,
            source.credibility,
          ],
        );
      }

      for (const question of input.followUpQuestions) {
        await client.query(
          `insert into public.research_questions (session_id, question, ai_provider)
           values ($1, $2, $3::ai_provider)`,
          [input.sessionId, question, input.aiProvider],
        );
      }

      await client.query(
        `update public.research_sessions
            set ai_provider = $2::ai_provider, updated_at = now()
          where id = $1`,
        [input.sessionId, input.aiProvider],
      );

      await client.query("commit");
      return result;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Marks a session deleted when the AI call failed, so no empty shells remain. */
  async markSessionFailed(sessionId: string, reason: string): Promise<void> {
    await this.pool.query(
      `update public.research_sessions
          set status = 'inactive'::record_status,
              metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('error', $2::text),
              updated_at = now()
        where id = $1`,
      [sessionId, reason],
    );
  }

  async list(
    tenant: TenantContext,
    query: ListResearchQueryDto,
  ): Promise<{ items: ResearchSessionRow[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = query.limit ?? 20;
    const params: unknown[] = [tenant.organizationId];
    const where = [ResearchRepository.TENANT_SCOPE, `s.status <> 'deleted'::record_status`];

    if (query.project_id) {
      params.push(query.project_id);
      where.push(`s.project_id = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`(s.title ilike $${params.length} or s.topic ilike $${params.length})`);
    }
    if (query.depth) {
      params.push(query.depth);
      where.push(`s.depth = $${params.length}::research_depth`);
    }
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (decoded) {
        params.push(decoded.createdAt, decoded.id);
        where.push(
          `(s.created_at, s.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
        );
      }
    }

    params.push(limit + 1);
    const { rows } = await this.pool.query<ResearchSessionRow>(
      `select ${SESSION_COLUMNS_S}
         from public.research_sessions s
        where ${where.join(" and ")}
        order by s.created_at desc, s.id desc
        limit $${params.length}`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    };
  }

  async findSession(tenant: TenantContext, id: string): Promise<ResearchSessionRow> {
    const { rows } = await this.pool.query<ResearchSessionRow>(
      `select ${SESSION_COLUMNS_S}
         from public.research_sessions s
        where ${ResearchRepository.TENANT_SCOPE} and s.id = $2
          and s.status <> 'deleted'::record_status`,
      [tenant.organizationId, id],
    );
    const session = rows[0];
    if (!session) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Research session not found" });
    }
    return session;
  }

  async findResults(sessionId: string): Promise<ResearchResultRow[]> {
    const { rows } = await this.pool.query<ResearchResultRow>(
      `select id, session_id, title, summary, content, confidence_score,
              token_usage, processing_time_ms, metadata, created_at
         from public.research_results
        where session_id = $1
        order by created_at asc`,
      [sessionId],
    );
    return rows;
  }

  async findSources(resultIds: string[]): Promise<Map<string, ResearchSourceRow[]>> {
    if (resultIds.length === 0) return new Map();
    const { rows } = await this.pool.query<ResearchSourceRow & { result_id: string }>(
      `select id, result_id, title, url, author, source_type, credibility_score
         from public.research_sources
        where result_id = any($1::uuid[])
        order by credibility_score desc nulls last`,
      [resultIds],
    );
    const map = new Map<string, ResearchSourceRow[]>();
    for (const row of rows) {
      const list = map.get(row.result_id) ?? [];
      list.push(row);
      map.set(row.result_id, list);
    }
    return map;
  }

  async findQuestions(sessionId: string): Promise<ResearchQuestionRow[]> {
    const { rows } = await this.pool.query<ResearchQuestionRow>(
      `select id, question, answer, created_at
         from public.research_questions
        where session_id = $1
        order by created_at asc`,
      [sessionId],
    );
    return rows;
  }

  async addQuestion(
    sessionId: string,
    question: string,
    answer: string,
    aiProvider: string,
  ): Promise<ResearchQuestionRow> {
    const { rows } = await this.pool.query<ResearchQuestionRow>(
      `insert into public.research_questions (session_id, question, answer, ai_provider)
       values ($1, $2, $3, $4::ai_provider)
       returning id, question, answer, created_at`,
      [sessionId, question, answer, aiProvider],
    );
    return rows[0]!;
  }

  async softDelete(tenant: TenantContext, id: string): Promise<void> {
    await this.findSession(tenant, id);
    await this.pool.query(
      `update public.research_sessions
          set status = 'deleted'::record_status, updated_at = now()
        where id = $1`,
      [id],
    );
  }
}

/* --------------------------------------------------------- cursors */

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const [createdAt, id] = Buffer.from(cursor, "base64url").toString().split("|");
    return createdAt && id ? { createdAt, id } : null;
  } catch {
    return null;
  }
}
