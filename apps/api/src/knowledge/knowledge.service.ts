import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  chunkText,
  EmbeddingService,
  INGEST_CREDIT_COST,
  SEARCH_CREDIT_COST,
} from "../ai/embeddings/embedding.service";
import type { TenantContext } from "../tenancy/tenancy.service";
import { KnowledgeRepository, type SearchHit } from "./knowledge.repository";
import type { CreateDocumentDto, SearchKnowledgeDto } from "./dto/knowledge.dto";

/**
 * Similarity floor for a chunk to count as relevant. Below this, cosine
 * matches on 1536-dimension embeddings are mostly topical noise, and feeding
 * noise to the model is worse than retrieving nothing.
 */
const MIN_SIMILARITY = 0.25;

/** Rough token estimate; only used to record chunk size. */
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly embeddings: EmbeddingService,
  ) {}

  status() {
    return {
      available: this.embeddings.isAvailable(),
      providers: this.embeddings.available(),
      ingest_credits: INGEST_CREDIT_COST,
      search_credits: SEARCH_CREDIT_COST,
    };
  }

  async listDocuments(tenant: TenantContext, projectId: string) {
    await this.repository.assertProjectInTenant(tenant, projectId);
    return { items: await this.repository.listDocuments(tenant, projectId) };
  }

  /**
   * Ingest a document: chunk, embed, store. Identical content is rejected
   * before anything is embedded, so re-pasting the same notes costs nothing.
   */
  async createDocument(tenant: TenantContext, dto: CreateDocumentDto) {
    const base = await this.repository.ensureBase(tenant, dto.project_id);

    const checksum = createHash("sha256").update(dto.content.trim()).digest("hex");
    const duplicate = await this.repository.findByChecksum(base.id, checksum);
    if (duplicate) {
      throw new ConflictException({
        code: "DUPLICATE_DOCUMENT",
        message: `This content is already in your knowledge base as "${duplicate.title}"`,
      });
    }

    const chunks = chunkText(dto.content);
    if (chunks.length === 0) {
      throw new ConflictException({
        code: "EMPTY_DOCUMENT",
        message: "The document has no readable text",
      });
    }

    const document = await this.embeddings.withCredits(
      tenant.organizationId,
      INGEST_CREDIT_COST,
      `Knowledge ingest: ${dto.title}`,
      async () => {
        const vectors = await this.embeddings.embed(chunks.map((c) => c.text));
        return this.repository.saveDocument({
          baseId: base.id,
          title: dto.title.trim(),
          sourceType: dto.source_url ? "url" : "text",
          sourceUrl: dto.source_url ?? null,
          content: dto.content,
          checksum,
          chunks: chunks.map((c, i) => ({
            index: c.index,
            text: c.text,
            vector: vectors[i]!,
            tokenCount: estimateTokens(c.text),
          })),
        });
      },
    );

    this.logger.log({ document: document.id, chunks: chunks.length, project: dto.project_id });
    return document;
  }

  async deleteDocument(tenant: TenantContext, id: string) {
    await this.repository.deleteDocument(tenant, id);
    return { deleted: true };
  }

  /** Semantic search over a project's documents. */
  async search(tenant: TenantContext, dto: SearchKnowledgeDto) {
    const base = await this.repository.findBaseForProject(tenant, dto.project_id);
    if (!base) {
      await this.repository.assertProjectInTenant(tenant, dto.project_id);
      return { items: [], query: dto.query };
    }

    const hits = await this.embeddings.withCredits(
      tenant.organizationId,
      SEARCH_CREDIT_COST,
      `Knowledge search: ${dto.query.slice(0, 60)}`,
      async () => {
        const [vector] = await this.embeddings.embed([dto.query]);
        return this.repository.searchChunks(
          base.id,
          vector!,
          dto.limit ?? 8,
          MIN_SIMILARITY,
        );
      },
    );

    await this.repository.recordSearch(tenant.userId, base.id, dto.query, hits.length);
    return { items: hits, query: dto.query };
  }

  /**
   * Retrieval for other modules (chat, research). Never throws and never
   * charges: if embeddings are unavailable the caller simply proceeds without
   * knowledge rather than failing the user's actual request.
   */
  async retrieveForContext(
    tenant: TenantContext,
    projectId: string,
    query: string,
    limit = 4,
  ): Promise<SearchHit[]> {
    try {
      if (!this.embeddings.isAvailable()) return [];
      const base = await this.repository.findBaseForProject(tenant, projectId);
      if (!base) return [];

      const [vector] = await this.embeddings.embed([query]);
      return await this.repository.searchChunks(base.id, vector!, limit, MIN_SIMILARITY);
    } catch (err) {
      this.logger.warn({ err }, "knowledge retrieval failed; continuing without it");
      return [];
    }
  }
}
