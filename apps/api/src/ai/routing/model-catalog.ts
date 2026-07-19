import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import type { ProviderSlug } from "../providers/provider.types";

export interface CatalogModel {
  modelId: string;
  providerId: string;
  providerSlug: ProviderSlug;
  modelName: string;
  contextWindow: number | null;
  /** USD per 1M tokens (as stored in ai_models). */
  inputPrice: number;
  outputPrice: number;
}

/**
 * Model catalog — resolves a documented model *family* (e.g. "claude-opus")
 * to a concrete row in `ai_models`, so the routing rules stay stable while
 * the actual model ids evolve in the database.
 *
 * Cached in-process with a short TTL: the catalog changes rarely, and every
 * AI request would otherwise pay for a lookup.
 */
@Injectable()
export class ModelCatalog {
  private readonly logger = new Logger(ModelCatalog.name);
  private cache: CatalogModel[] = [];
  private loadedAt = 0;
  private static readonly TTL_MS = 60_000;

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private async all(): Promise<CatalogModel[]> {
    if (this.cache.length && Date.now() - this.loadedAt < ModelCatalog.TTL_MS) {
      return this.cache;
    }
    const { rows } = await this.pool.query<{
      model_id: string;
      provider_id: string;
      provider_slug: ProviderSlug;
      model_name: string;
      context_window: number | null;
      input_price: string | null;
      output_price: string | null;
    }>(
      `select m.id            as model_id,
              p.id            as provider_id,
              p.provider_type::text as provider_slug,
              m.model_name,
              m.context_window,
              m.input_price,
              m.output_price
         from public.ai_models m
         join public.ai_providers p on p.id = m.provider_id
        where m.is_active = true and p.is_active = true`,
    );

    this.cache = rows.map((r) => ({
      modelId: r.model_id,
      providerId: r.provider_id,
      providerSlug: r.provider_slug,
      modelName: r.model_name,
      contextWindow: r.context_window,
      inputPrice: Number(r.input_price ?? 0),
      outputPrice: Number(r.output_price ?? 0),
    }));
    this.loadedAt = Date.now();
    return this.cache;
  }

  /**
   * Resolve (provider, family) to a concrete model.
   *
   * Provider identity comes from `ai_providers.provider_type` (the ai_provider
   * enum: openai/anthropic/google/...), not `slug`, which is a human-facing
   * label ("claude", "gemini") and would not match adapter identities.
   * Families are matched as name prefixes — "claude-opus" matches
   * "claude-opus-4-6" — so new versions are picked up without a code change.
   */
  async resolve(provider: ProviderSlug, family: string): Promise<CatalogModel | null> {
    const models = await this.all();
    const forProvider = models.filter((m) => m.providerSlug === provider);

    const exact = forProvider.find((m) => m.modelName === family);
    if (exact) return exact;

    const prefixed = forProvider
      .filter((m) => m.modelName.startsWith(family))
      .sort((a, b) => b.modelName.localeCompare(a.modelName));
    if (prefixed[0]) return prefixed[0];

    // Family aliases: documented names vs catalog naming.
    const alias: Record<string, string[]> = {
      "gemini-pro": ["gemini-2.5-pro", "gemini-pro"],
      "gemini-flash": ["gemini-2.5-flash", "gemini-flash"],
      "claude-opus": ["claude-opus"],
      "claude-sonnet": ["claude-sonnet"],
      "gpt-5": ["gpt-5"],
      "gpt-5-mini": ["gpt-5-mini"],
    };
    for (const candidate of alias[family] ?? []) {
      const match = forProvider.find((m) => m.modelName.startsWith(candidate));
      if (match) return match;
    }
    return null;
  }

  /** USD cost for a completed request (prices are per 1M tokens). */
  static estimateCost(model: CatalogModel, promptTokens: number, completionTokens: number): number {
    const cost =
      (promptTokens / 1_000_000) * model.inputPrice +
      (completionTokens / 1_000_000) * model.outputPrice;
    return Number(cost.toFixed(6));
  }

  /** Test/ops hook: force a reload on the next resolve. */
  invalidate(): void {
    this.cache = [];
    this.loadedAt = 0;
  }
}
