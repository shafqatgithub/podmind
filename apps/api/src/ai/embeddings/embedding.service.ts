import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ProviderRegistry } from "../providers/provider.registry";
import { CreditsService } from "../credits/credits.service";
import type { ProviderSlug } from "../providers/provider.types";

/** The width the knowledge_chunks.embedding column is declared with. */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Chunk size in characters. Small enough that a retrieved chunk is a precise
 * answer rather than a page, large enough to keep a complete thought intact.
 */
const CHUNK_CHARS = 1200;
const CHUNK_OVERLAP = 150;

/** Credits per document ingestion, independent of length. */
export const INGEST_CREDIT_COST = 2;
/** Credits per search — embedding one short query is nearly free. */
export const SEARCH_CREDIT_COST = 1;

export interface Chunk {
  index: number;
  text: string;
}

/**
 * Splits text into overlapping chunks on paragraph boundaries where possible.
 * Overlap means a sentence spanning a boundary is still retrievable from one
 * side or the other.
 */
export function chunkText(text: string): Chunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const chunks: Chunk[] = [];
  let cursor = 0;
  let index = 0;

  while (cursor < clean.length) {
    let end = Math.min(cursor + CHUNK_CHARS, clean.length);

    if (end < clean.length) {
      // Prefer a paragraph break, then a sentence end, then a space.
      const window = clean.slice(cursor, end);
      const paragraph = window.lastIndexOf("\n\n");
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("।"));
      const space = window.lastIndexOf(" ");
      const boundary =
        paragraph > CHUNK_CHARS * 0.5
          ? paragraph
          : sentence > CHUNK_CHARS * 0.5
            ? sentence + 1
            : space > CHUNK_CHARS * 0.5
              ? space
              : -1;
      if (boundary > 0) end = cursor + boundary;
    }

    const slice = clean.slice(cursor, end).trim();
    if (slice) chunks.push({ index: index++, text: slice });
    if (end >= clean.length) break;
    cursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }

  return chunks;
}

/**
 * Embeddings for knowledge search.
 *
 * Only providers that implement `embed` are eligible, and the vector width is
 * fixed by the database column, so a provider whose output does not match is
 * rejected rather than silently stored.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly registry: ProviderRegistry,
    private readonly credits: CreditsService,
  ) {}

  /** Providers that can embed and have credentials. */
  available(): ProviderSlug[] {
    return this.registry
      .all()
      .filter((p) => typeof p.embed === "function" && p.isConfigured())
      .map((p) => p.slug);
  }

  isAvailable(): boolean {
    return this.available().length > 0;
  }

  /**
   * Embed a batch. Credits are charged by the caller, which knows whether
   * this is an ingestion or a search.
   */
  async embed(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];

    for (const slug of this.available()) {
      const provider = this.registry.get(slug);
      if (!provider?.embed) continue;
      try {
        const result = await provider.embed(inputs, EMBEDDING_DIMENSIONS);
        this.logger.debug({ provider: slug, inputs: inputs.length, tokens: result.totalTokens });
        return result.vectors;
      } catch (err) {
        this.logger.warn({ provider: slug, err }, "embedding provider failed");
      }
    }

    throw new ServiceUnavailableException({
      code: "EMBEDDINGS_UNAVAILABLE",
      message:
        "No provider is configured for embeddings — add an OpenAI API key to enable knowledge search",
    });
  }

  /** Charge for an operation, refunding if the work then fails. */
  async withCredits<T>(
    organizationId: string,
    amount: number,
    description: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const transaction = await this.credits.consume(organizationId, amount, description);
    try {
      return await work();
    } catch (err) {
      await this.credits.refund(
        organizationId,
        amount,
        `Refund for ${transaction}: ${description} failed`,
      );
      throw err;
    }
  }
}

/** Postgres vector literal — pgvector accepts the bracketed array form. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
