import { Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../../database/database.module";
import { CreditsService } from "../credits/credits.service";
import { ProviderRegistry } from "../providers/provider.registry";
import {
  type AiMessage,
  type AiTask,
  type CompletionResult,
  ProviderError,
  type StreamEvent,
  type ProviderSlug,
} from "../providers/provider.types";
import { ModelCatalog, type CatalogModel } from "./model-catalog";
import { buildRoutePlan } from "./model-selection";

/** Credit cost per task — flat pricing so spend is predictable for users. */
export const TASK_CREDIT_COST: Record<AiTask, number> = {
  research: 10,
  guest: 8,
  outline: 5,
  script: 12,
  seo: 3,
  social: 3,
  summary: 2,
  translation: 2,
  fact_check: 5,
  chat: 1,
};

export interface RouteRequest {
  organizationId: string;
  task: AiTask;
  messages: AiMessage[];
  projectId?: string | null;
  conversationId?: string | null;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Organization preference — hoisted in the plan, never a hard override. */
  preferredProvider?: ProviderSlug | null;
}

export interface RouteResult extends CompletionResult {
  requestId: string;
  latencyMs: number;
  estimatedCost: number;
  creditsSpent: number;
  /** Providers tried and rejected before the successful one. */
  fallbacksUsed: ProviderSlug[];
}

/**
 * AI Router — the brain described in 17-AI-Router-Architecture.
 *
 * Flow per request: credit check → route plan (task rules + long-context
 * override + org preference) → attempt candidates in order with one retry
 * for transient failures → persist telemetry to `ai_requests` → refund
 * credits if every candidate failed.
 */
@Injectable()
export class AiRouterService {
  private readonly logger = new Logger(AiRouterService.name);
  private static readonly RETRIES_PER_CANDIDATE = 1;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly registry: ProviderRegistry,
    private readonly catalog: ModelCatalog,
    private readonly credits: CreditsService,
  ) {}

  async route(request: RouteRequest): Promise<RouteResult> {
    const cost = TASK_CREDIT_COST[request.task];
    const promptChars = request.messages.reduce((n, m) => n + m.content.length, 0);
    const plan = buildRoutePlan(request.task, promptChars, request.preferredProvider);

    // Charge first, refund on total failure: prevents free retries and keeps
    // the ledger honest under concurrency.
    const creditTx = await this.credits.consume(
      request.organizationId,
      cost,
      `AI ${request.task}`,
    );

    const fallbacksUsed: ProviderSlug[] = [];
    let lastError: ProviderError | null = null;

    for (const candidate of plan) {
      const provider = this.registry.get(candidate.provider);
      if (!provider?.isConfigured()) {
        this.logger.debug({ provider: candidate.provider }, "skipping unconfigured provider");
        continue;
      }

      const model = await this.catalog.resolve(candidate.provider, candidate.family);
      if (!model) {
        this.logger.warn(
          { provider: candidate.provider, family: candidate.family },
          "no active model in catalog for family",
        );
        continue;
      }

      for (let attempt = 0; attempt <= AiRouterService.RETRIES_PER_CANDIDATE; attempt++) {
        const startedAt = Date.now();
        try {
          const result = await provider.complete({
            model: model.modelName,
            messages: request.messages,
            jsonMode: request.jsonMode,
            maxTokens: request.maxTokens,
            temperature: request.temperature,
          });

          const latencyMs = Date.now() - startedAt;
          const estimatedCost = ModelCatalog.estimateCost(
            model,
            result.promptTokens,
            result.completionTokens,
          );
          const requestId = await this.recordRequest({
            request,
            model,
            result,
            latencyMs,
            estimatedCost,
            success: true,
          });

          this.logger.log({
            request_id: requestId,
            task: request.task,
            provider: result.provider,
            model: result.model,
            latency_ms: latencyMs,
            tokens: result.promptTokens + result.completionTokens,
            fallbacks: fallbacksUsed.length,
          });

          return {
            ...result,
            requestId,
            latencyMs,
            estimatedCost,
            creditsSpent: cost,
            fallbacksUsed,
          };
        } catch (err) {
          const providerError =
            err instanceof ProviderError
              ? err
              : new ProviderError(candidate.provider, String(err), true);
          lastError = providerError;

          const willRetry =
            providerError.retryable && attempt < AiRouterService.RETRIES_PER_CANDIDATE;
          this.logger.warn({
            provider: candidate.provider,
            status: providerError.status,
            retryable: providerError.retryable,
            attempt,
            message: providerError.message,
          });

          await this.recordRequest({
            request,
            model,
            result: null,
            latencyMs: Date.now() - startedAt,
            estimatedCost: 0,
            success: false,
            errorMessage: providerError.message,
          });

          if (willRetry) {
            await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
            continue;
          }
          break; // move to the next candidate in the plan
        }
      }

      fallbacksUsed.push(candidate.provider);
    }

    // Every candidate failed — return the credits. The ledger links back to
    // the original spend by id in the description (related_request is an FK
    // to ai_requests, not to the transaction table).
    await this.credits.refund(
      request.organizationId,
      cost,
      `Refund for ${creditTx}: AI ${request.task} failed`,
    );

    throw new ServiceUnavailableException({
      code: "AI_UNAVAILABLE",
      message:
        lastError?.message ??
        "No AI provider is available for this task — check provider configuration",
      details: { task: request.task, tried: fallbacksUsed },
    });
  }

  /** Telemetry row in `ai_requests` (Observable principle). */
  private async recordRequest(input: {
    request: RouteRequest;
    model: CatalogModel;
    result: CompletionResult | null;
    latencyMs: number;
    estimatedCost: number;
    success: boolean;
    errorMessage?: string;
  }): Promise<string> {
    const promptTokens = input.result?.promptTokens ?? 0;
    const completionTokens = input.result?.completionTokens ?? 0;
    const { rows } = await this.pool.query<{ id: string }>(
      `insert into public.ai_requests
         (organization_id, project_id, conversation_id, provider_id, model_id, task,
          prompt_tokens, completion_tokens, total_tokens,
          estimated_cost, latency_ms, success, error_message, metadata)
       values ($14,$1,$2,$3,$4,$5::ai_task,$6,$7,$8,$9,$10,$11,$12,$13)
       returning id`,
      [
        input.request.projectId ?? null,
        input.request.conversationId ?? null,
        input.model.providerId,
        input.model.modelId,
        input.request.task,
        promptTokens,
        completionTokens,
        promptTokens + completionTokens,
        input.estimatedCost,
        input.latencyMs,
        input.success,
        input.errorMessage ?? null,
        // Also kept in metadata: analytics reads the indexed column, while
        // the metadata copy keeps historical rows and any external consumer
        // working unchanged.
        JSON.stringify({ organization_id: input.request.organizationId }),
        input.request.organizationId,
      ],
    );
    return rows[0]!.id;
  }
  /**
   * Streaming variant of route().
   *
   * The rules are the same — charge first, refund on total failure — but the
   * failure window is different: once the first token has reached the user
   * the request has succeeded from their point of view, so this does not fall
   * back mid-answer. Falling back after partial output would splice two
   * different models' sentences together, which reads as corruption.
   *
   * Providers without a stream() are skipped rather than silently downgraded,
   * because a caller asking to stream has already committed to that shape.
   */
  async *routeStream(request: RouteRequest): AsyncIterable<StreamEvent> {
    const cost = TASK_CREDIT_COST[request.task];
    const promptChars = request.messages.reduce((n, m) => n + m.content.length, 0);
    const plan = buildRoutePlan(request.task, promptChars, request.preferredProvider);

    const creditTx = await this.credits.consume(
      request.organizationId,
      cost,
      `AI ${request.task}`,
    );

    let lastError: ProviderError | null = null;

    for (const candidate of plan) {
      const provider = this.registry.get(candidate.provider);
      if (!provider?.isConfigured() || typeof provider.stream !== "function") continue;

      const model = await this.catalog.resolve(candidate.provider, candidate.family);
      if (!model) continue;

      const startedAt = Date.now();
      let delivered = false;
      let text = "";
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        for await (const event of provider.stream({
          model: model.modelName,
          messages: request.messages,
          maxTokens: request.maxTokens,
          temperature: request.temperature,
        })) {
          if (event.type === "delta") {
            delivered = true;
            text += event.text;
            yield event;
          } else {
            // The provider's own done carries the tallies but not which
            // provider answered. It is absorbed rather than forwarded so a
            // consumer sees exactly one done event, emitted below.
            promptTokens = event.promptTokens;
            completionTokens = event.completionTokens;
          }
        }

        await this.recordRequest({
          request,
          model,
          result: {
            text,
            promptTokens,
            completionTokens,
            model: model.modelName,
            provider: candidate.provider,
          },
          latencyMs: Date.now() - startedAt,
          estimatedCost: ModelCatalog.estimateCost(model, promptTokens, completionTokens),
          success: true,
        });

        yield {
          type: "done",
          promptTokens,
          completionTokens,
          model: model.modelName,
          provider: candidate.provider,
        };
        return;
      } catch (err) {
        const providerError =
          err instanceof ProviderError
            ? err
            : new ProviderError(candidate.provider, String(err), false);
        lastError = providerError;

        await this.recordRequest({
          request,
          model,
          result: {
            text,
            promptTokens,
            completionTokens,
            model: model.modelName,
            provider: candidate.provider,
          },
          latencyMs: Date.now() - startedAt,
          estimatedCost: ModelCatalog.estimateCost(model, promptTokens, completionTokens),
          success: false,
          errorMessage: providerError.message,
        });

        // Already streaming to the user: stop rather than stitch a second
        // model onto a half-written sentence. The turn is kept and charged,
        // because they received an answer.
        if (delivered) {
          yield {
            type: "done",
            promptTokens,
            completionTokens,
            model: model.modelName,
            provider: candidate.provider,
          };
          return;
        }
        // Nothing delivered yet, so the next provider is a clean start.
      }
    }

    await this.credits.refund(
      request.organizationId,
      cost,
      `Refund for ${creditTx}: AI ${request.task} stream failed`,
    );

    throw (
      lastError ??
      new ProviderError(
        "openai",
        "No AI provider available for streaming — check provider configuration",
        false,
      )
    );
  }

}
