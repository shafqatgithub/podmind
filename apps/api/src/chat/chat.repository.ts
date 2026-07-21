import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { ListConversationsQueryDto, UpdateConversationDto } from "./dto/chat.dto";

export interface ConversationRow {
  id: string;
  project_id: string | null;
  user_id: string;
  title: string;
  ai_provider: string | null;
  model_name: string | null;
  total_messages: number;
  total_tokens: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  ai_provider: string | null;
  model_name: string | null;
  total_tokens: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface MemoryRow {
  id: string;
  memory_type: string;
  title: string | null;
  content: string;
  importance: number | null;
}

const CONVERSATION_COLUMNS = `c.id, c.project_id, c.user_id, c.title,
  c.ai_provider::text as ai_provider, c.model_name, c.total_messages,
  c.total_tokens, c.is_pinned, c.is_archived, c.created_at, c.updated_at`;

/**
 * Chat repository.
 *
 * A conversation belongs to a user and optionally to a project. Ownership is
 * the tenant boundary: a conversation is reachable only by the user who
 * created it, and when it is attached to a project that project must belong
 * to the caller's organization.
 */
@Injectable()
export class ChatRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async assertProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.niche,
              p.language::text as language, p.description
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
      description: string | null;
    };
  }

  async createConversation(
    tenant: TenantContext,
    input: { projectId?: string | null; title: string },
  ): Promise<ConversationRow> {
    const { rows } = await this.pool.query<ConversationRow>(
      `insert into public.ai_conversations (project_id, user_id, title)
       values ($1, $2, $3)
       returning id, project_id, user_id, title, ai_provider::text as ai_provider,
                 model_name, total_messages, total_tokens, is_pinned, is_archived,
                 created_at, updated_at`,
      [input.projectId ?? null, tenant.userId, input.title],
    );
    return rows[0]!;
  }

  async findConversation(tenant: TenantContext, id: string): Promise<ConversationRow> {
    const { rows } = await this.pool.query<ConversationRow>(
      `select ${CONVERSATION_COLUMNS}
         from public.ai_conversations c
        where c.id = $2 and c.user_id = $1`,
      [tenant.userId, id],
    );
    const conversation = rows[0];
    if (!conversation) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Conversation not found" });
    }
    return conversation;
  }

  async listConversations(
    tenant: TenantContext,
    query: ListConversationsQueryDto,
  ): Promise<{ items: ConversationRow[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = query.limit ?? 30;
    const params: unknown[] = [tenant.userId];
    const where = ["c.user_id = $1"];

    if (!query.include_archived) where.push("c.is_archived = false");
    if (query.project_id) {
      params.push(query.project_id);
      where.push(`c.project_id = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`c.title ilike $${params.length}`);
    }
    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (decoded) {
        params.push(decoded.updatedAt, decoded.id);
        where.push(
          `(c.updated_at, c.id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`,
        );
      }
    }

    params.push(limit + 1);
    const { rows } = await this.pool.query<ConversationRow>(
      `select ${CONVERSATION_COLUMNS}
         from public.ai_conversations c
        where ${where.join(" and ")}
        order by c.is_pinned desc, c.updated_at desc, c.id desc
        limit $${params.length}`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.updated_at, last.id) : null,
    };
  }

  async findMessages(conversationId: string, limit = 200): Promise<MessageRow[]> {
    const { rows } = await this.pool.query<MessageRow>(
      `select id, conversation_id, role, content, ai_provider::text as ai_provider,
              model_name, total_tokens, response_time_ms, created_at
         from public.ai_messages
        where conversation_id = $1
        order by created_at asc
        limit $2`,
      [conversationId, limit],
    );
    return rows;
  }

  async addUserMessage(conversationId: string, content: string): Promise<MessageRow> {
    const { rows } = await this.pool.query<MessageRow>(
      `insert into public.ai_messages (conversation_id, role, content)
       values ($1, 'user', $2)
       returning id, conversation_id, role, content, ai_provider::text as ai_provider,
                 model_name, total_tokens, response_time_ms, created_at`,
      [conversationId, content],
    );
    return rows[0]!;
  }

  /**
   * Persist the assistant reply and roll up conversation counters in one
   * transaction, so totals can never drift from the messages that produced
   * them.
   */
  async addAssistantMessage(input: {
    conversationId: string;
    content: string;
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
    responseTimeMs: number;
    parentMessageId: string;
  }): Promise<MessageRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");
      const totalTokens = input.promptTokens + input.completionTokens;

      const { rows } = await client.query<MessageRow>(
        `insert into public.ai_messages
           (conversation_id, role, content, ai_provider, model_name,
            prompt_tokens, completion_tokens, total_tokens, estimated_cost,
            response_time_ms, parent_message_id)
         values ($1, 'assistant', $2, $3::ai_provider, $4, $5, $6, $7, $8, $9, $10)
         returning id, conversation_id, role, content, ai_provider::text as ai_provider,
                   model_name, total_tokens, response_time_ms, created_at`,
        [
          input.conversationId,
          input.content,
          input.provider,
          input.model,
          input.promptTokens,
          input.completionTokens,
          totalTokens,
          input.estimatedCost,
          input.responseTimeMs,
          input.parentMessageId,
        ],
      );

      await client.query(
        `update public.ai_conversations
            set total_messages = coalesce(total_messages, 0) + 2,
                total_tokens   = coalesce(total_tokens, 0) + $2,
                total_cost     = coalesce(total_cost, 0) + $3,
                ai_provider    = $4::ai_provider,
                model_name     = $5,
                updated_at     = now()
          where id = $1`,
        [
          input.conversationId,
          totalTokens,
          input.estimatedCost,
          input.provider,
          input.model,
        ],
      );

      await client.query("commit");
      return rows[0]!;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Remove a user message whose reply never arrived, so no dangling turn remains. */
  async deleteMessage(id: string): Promise<void> {
    await this.pool.query(`delete from public.ai_messages where id = $1`, [id]);
  }

  async setTitle(conversationId: string, title: string): Promise<void> {
    await this.pool.query(
      `update public.ai_conversations set title = $2, updated_at = now() where id = $1`,
      [conversationId, title],
    );
  }

  async updateConversation(
    tenant: TenantContext,
    id: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationRow> {
    await this.findConversation(tenant, id);
    const sets: string[] = [];
    const params: unknown[] = [id];

    for (const [column, value] of Object.entries({
      title: dto.title,
      is_pinned: dto.is_pinned,
      is_archived: dto.is_archived,
    })) {
      if (value !== undefined) {
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
    }
    if (sets.length === 0) return this.findConversation(tenant, id);

    const { rows } = await this.pool.query<ConversationRow>(
      `update public.ai_conversations c
          set ${sets.join(", ")}, updated_at = now()
        where c.id = $1
        returning ${CONVERSATION_COLUMNS.replace(/c\./g, "")}`,
      params,
    );
    return rows[0]!;
  }

  async deleteConversation(tenant: TenantContext, id: string): Promise<void> {
    await this.findConversation(tenant, id);
    await this.pool.query(`delete from public.ai_conversations where id = $1`, [id]);
  }

  /** Long-term memories that give the assistant continuity across sessions. */
  async findMemories(
    tenant: TenantContext,
    projectId: string | null,
    limit = 12,
  ): Promise<MemoryRow[]> {
    const { rows } = await this.pool.query<MemoryRow>(
      `select id, memory_type::text as memory_type, title, content, importance
         from public.ai_memories
        where user_id = $1
          and (expires_at is null or expires_at > now())
          and ($2::uuid is null or project_id = $2 or project_id is null)
        order by importance desc nulls last, last_accessed_at desc nulls last
        limit $3`,
      [tenant.userId, projectId, limit],
    );
    return rows;
  }

  /** Most recent research for the project, so chat can reference real work. */
  async findRecentResearch(projectId: string, limit = 3) {
    const { rows } = await this.pool.query<{ title: string; summary: string | null }>(
      `select coalesce(rr.title, rs.title) as title, rr.summary
         from public.research_results rr
         join public.research_sessions rs on rs.id = rr.session_id
        where rs.project_id = $1 and rs.status = 'active'::record_status
        order by rr.created_at desc
        limit $2`,
      [projectId, limit],
    );
    return rows;
  }
}

/* --------------------------------------------------------- cursors */

function encodeCursor(updatedAt: string, id: string): string {
  return Buffer.from(`${updatedAt}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const [updatedAt, id] = Buffer.from(cursor, "base64url").toString().split("|");
    return updatedAt && id ? { updatedAt, id } : null;
  } catch {
    return null;
  }
}
