import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import { toVectorLiteral } from "../ai/embeddings/embedding.service";

export interface KnowledgeBaseRow {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  knowledge_base_id: string;
  title: string;
  source_type: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
}

export interface SearchHit {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
}

/**
 * Knowledge repository.
 *
 * A knowledge base belongs to a project, so the tenant boundary is the same
 * as everywhere else: project -> workspace -> organization. Documents and
 * chunks are reached only through a base the caller can see.
 */
@Injectable()
export class KnowledgeRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly BASE_IN_TENANT = `
    kb.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string): Promise<void> {
    const { rows } = await this.pool.query(
      `select 1 from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
  }

  /** One base per project, created on first use. */
  async ensureBase(tenant: TenantContext, projectId: string): Promise<KnowledgeBaseRow> {
    await this.assertProjectInTenant(tenant, projectId);

    const existing = await this.pool.query<KnowledgeBaseRow>(
      `select id, project_id, name, description, created_at
         from public.knowledge_bases where project_id = $1 limit 1`,
      [projectId],
    );
    if (existing.rows[0]) return existing.rows[0];

    const { rows } = await this.pool.query<KnowledgeBaseRow>(
      `insert into public.knowledge_bases (project_id, created_by, name, description)
       values ($1, $2, 'Project knowledge', 'Documents the AI can cite for this project')
       on conflict do nothing
       returning id, project_id, name, description, created_at`,
      [projectId, tenant.userId],
    );
    if (rows[0]) return rows[0];

    // Lost a race — the other request created it.
    const retry = await this.pool.query<KnowledgeBaseRow>(
      `select id, project_id, name, description, created_at
         from public.knowledge_bases where project_id = $1 limit 1`,
      [projectId],
    );
    return retry.rows[0]!;
  }

  async findBaseForProject(
    tenant: TenantContext,
    projectId: string,
  ): Promise<KnowledgeBaseRow | null> {
    const { rows } = await this.pool.query<KnowledgeBaseRow>(
      `select kb.id, kb.project_id, kb.name, kb.description, kb.created_at
         from public.knowledge_bases kb
        where ${KnowledgeRepository.BASE_IN_TENANT} and kb.project_id = $2
        limit 1`,
      [tenant.organizationId, projectId],
    );
    return rows[0] ?? null;
  }

  async listDocuments(tenant: TenantContext, projectId: string): Promise<DocumentRow[]> {
    const { rows } = await this.pool.query<DocumentRow>(
      `select d.id, d.knowledge_base_id, d.title, d.source_type, d.source_url,
              d.status::text as status, d.created_at, d.updated_at,
              (select count(*)::int from public.knowledge_chunks c where c.document_id = d.id)
                as chunk_count
         from public.knowledge_documents d
         join public.knowledge_bases kb on kb.id = d.knowledge_base_id
        where ${KnowledgeRepository.BASE_IN_TENANT}
          and kb.project_id = $2
          and d.status <> 'deleted'::record_status
        order by d.created_at desc`,
      [tenant.organizationId, projectId],
    );
    return rows;
  }

  async findDocument(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<DocumentRow & { content: string | null }>(
      `select d.id, d.knowledge_base_id, d.title, d.source_type, d.source_url,
              d.status::text as status, d.content, d.created_at, d.updated_at
         from public.knowledge_documents d
         join public.knowledge_bases kb on kb.id = d.knowledge_base_id
        where ${KnowledgeRepository.BASE_IN_TENANT} and d.id = $2
          and d.status <> 'deleted'::record_status`,
      [tenant.organizationId, id],
    );
    const document = rows[0];
    if (!document) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Document not found" });
    }
    return document;
  }

  /** Same content ingested twice is caught before any embedding is paid for. */
  async findByChecksum(baseId: string, checksum: string): Promise<DocumentRow | null> {
    const { rows } = await this.pool.query<DocumentRow>(
      `select id, knowledge_base_id, title, source_type, source_url,
              status::text as status, created_at, updated_at
         from public.knowledge_documents
        where knowledge_base_id = $1 and checksum = $2
          and status <> 'deleted'::record_status
        limit 1`,
      [baseId, checksum],
    );
    return rows[0] ?? null;
  }

  /**
   * Store a document and all its embedded chunks atomically. A half-ingested
   * document would answer searches with partial knowledge and look complete.
   */
  async saveDocument(input: {
    baseId: string;
    title: string;
    sourceType: string;
    sourceUrl: string | null;
    content: string;
    checksum: string;
    chunks: { index: number; text: string; vector: number[]; tokenCount: number }[];
  }): Promise<DocumentRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<DocumentRow>(
        `insert into public.knowledge_documents
           (knowledge_base_id, title, source_type, source_url, content, checksum)
         values ($1, $2, $3, $4, $5, $6)
         returning id, knowledge_base_id, title, source_type, source_url,
                   status::text as status, created_at, updated_at`,
        [
          input.baseId,
          input.title,
          input.sourceType,
          input.sourceUrl,
          input.content,
          input.checksum,
        ],
      );
      const document = rows[0]!;

      for (const chunk of input.chunks) {
        await client.query(
          `insert into public.knowledge_chunks
             (document_id, chunk_index, chunk_text, token_count, embedding)
           values ($1, $2, $3, $4, $5::vector)`,
          [
            document.id,
            chunk.index,
            chunk.text,
            chunk.tokenCount,
            toVectorLiteral(chunk.vector),
          ],
        );
      }

      await client.query("commit");
      return { ...document, chunk_count: input.chunks.length };
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteDocument(tenant: TenantContext, id: string): Promise<void> {
    await this.findDocument(tenant, id);
    // Chunks cascade with the document.
    await this.pool.query(
      `update public.knowledge_documents
          set status = 'deleted'::record_status, updated_at = now()
        where id = $1`,
      [id],
    );
    await this.pool.query(`delete from public.knowledge_chunks where document_id = $1`, [id]);
  }

  /**
   * Nearest chunks by cosine distance. pgvector's `<=>` returns distance, so
   * similarity is 1 - distance and higher is better.
   */
  async searchChunks(
    baseId: string,
    queryVector: number[],
    limit: number,
    minSimilarity: number,
  ): Promise<SearchHit[]> {
    const { rows } = await this.pool.query<SearchHit>(
      `select c.id as chunk_id, c.document_id, d.title as document_title,
              c.chunk_text, c.chunk_index,
              1 - (c.embedding <=> $2::vector) as similarity
         from public.knowledge_chunks c
         join public.knowledge_documents d on d.id = c.document_id
        where d.knowledge_base_id = $1
          and d.status = 'active'::record_status
          and c.embedding is not null
          and 1 - (c.embedding <=> $2::vector) >= $4
        order by c.embedding <=> $2::vector
        limit $3`,
      [baseId, toVectorLiteral(queryVector), limit, minSimilarity],
    );
    return rows.map((r) => ({ ...r, similarity: Number(r.similarity) }));
  }

  async recordSearch(
    userId: string,
    baseId: string,
    query: string,
    resultCount: number,
  ): Promise<void> {
    await this.pool.query(
      `insert into public.knowledge_search_history (user_id, knowledge_base_id, query, result_count)
       values ($1, $2, $3, $4)`,
      [userId, baseId, query, resultCount],
    );
  }
}
