import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseHttpProvider } from "./base-http.provider";
import {
  type CompletionOptions,
  type CompletionResult,
  type EmbeddingResult,
  ProviderError,
  type ProviderSlug,
  type StreamEvent,
  JSON_INSTRUCTION,
} from "./provider.types";
import type { Env } from "../../config/env";

/**
 * The only model that searches on the Chat Completions path. Named here rather
 * than in the model catalogue because it is an implementation detail of how
 * this provider searches, not a model anyone picks.
 */
const OPENAI_SEARCH_MODEL = "gpt-5-search-api";

/** OpenAI adapter — Chat Completions API with native JSON mode. */
@Injectable()
export class OpenAiProvider extends BaseHttpProvider {
  readonly slug: ProviderSlug = "openai";

  constructor(config: ConfigService<Env, true>) {
    super(config.get("OPENAI_API_KEY", { infer: true }));
  }

  /**
   * GPT-5 and the o-series are reasoning models: they renamed `max_tokens`
   * to `max_completion_tokens` and reject any `temperature` other than the
   * default. Sending the legacy parameters is a hard 400, so the payload is
   * shaped per model family.
   */
  private static isReasoningModel(model: string): boolean {
    return /^(gpt-5|o\d)/.test(model);
  }

  supportsWebSearch(): boolean {
    return true;
  }

  protected buildRequest(options: CompletionOptions) {
    // Chat Completions only searches through a dedicated search model, which
    // always retrieves before answering. Swapping the model here keeps the
    // rest of the pipeline unaware that a search happened.
    if (options.webSearch) return this.buildSearchRequest(options);

    const reasoning = OpenAiProvider.isReasoningModel(options.model);
    const maxTokens = options.maxTokens ?? 4096;

    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: {
        model: options.model,
        messages: options.messages,
        ...(reasoning
          ? {
              max_completion_tokens: maxTokens,
              // Reasoning is billed against the same budget as the answer.
              // Left at the default, GPT-5 consumed the entire allowance
              // thinking and returned nothing across several live runs. The
              // work here is structured extraction, where a low effort still
              // produces a strong briefing and guarantees room for output.
              reasoning_effort: "low",
            }
          : { max_tokens: maxTokens, temperature: options.temperature ?? 0.7 }),
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      },
    };
  }

  /**
   * Web-search request.
   *
   * The search model path accepts a deliberately small set of parameters —
   * no temperature, no reasoning effort, no token cap — so the payload stays
   * minimal. JSON is asked for in the prompt instead of through
   * `response_format`, which this path does not accept; the shared extractor
   * pulls the object back out of the reply.
   */
  private buildSearchRequest(options: CompletionOptions) {
    const messages = options.jsonMode
      ? [...options.messages, { role: "system" as const, content: JSON_INSTRUCTION }]
      : options.messages;

    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: {
        model: OPENAI_SEARCH_MODEL,
        messages,
        web_search_options: {},
      },
    };
  }

  /** OpenAI needs asking for usage; without it the final tally never arrives. */
  protected override streamBody(): Record<string, unknown> {
    return { stream: true, stream_options: { include_usage: true } };
  }

  protected override parseStreamChunk(data: unknown): StreamEvent | null {
    const chunk = data as {
      model?: string;
      choices?: { delta?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number } | null;
    };

    const text = chunk.choices?.[0]?.delta?.content;
    if (typeof text === "string" && text.length > 0) {
      return { type: "delta", text };
    }

    // The usage frame arrives last and carries no choice, closing the stream.
    if (chunk.usage) {
      return {
        type: "done",
        promptTokens: chunk.usage.prompt_tokens ?? 0,
        completionTokens: chunk.usage.completion_tokens ?? 0,
        model: chunk.model ?? "",
      };
    }
    return null;
  }

  protected parseResponse(data: unknown, fallbackModel: string): CompletionResult {
    const body = data as {
      model?: string;
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const choice = body.choices?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string") {
      throw new ProviderError(this.slug, "Unexpected response shape from OpenAI", false);
    }

    // Reasoning models bill reasoning against the completion budget, so a
    // 'length' finish with no text means the budget ran out before output.
    // Naming that beats a generic empty-response error.
    if (choice?.finish_reason === "length" && text.trim().length === 0) {
      throw new ProviderError(
        this.slug,
        "OpenAI hit the token limit during reasoning and produced no output — raise max tokens for this task",
        false,
      );
    }

    return {
      text,
      promptTokens: body.usage?.prompt_tokens ?? 0,
      completionTokens: body.usage?.completion_tokens ?? 0,
      model: body.model ?? fallbackModel,
      provider: this.slug,
    };
  }

  /**
   * Embeddings for knowledge search. The schema stores vector(1536), which is
   * the native width of text-embedding-3-small, so no truncation is needed.
   */
  async embed(inputs: string[], dimensions: number): Promise<EmbeddingResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(this.slug, "openai has no API key configured", false);
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: inputs,
        dimensions,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      throw new ProviderError(
        this.slug,
        status === 401 || status === 403
          ? "openai rejected the API key"
          : `openai embeddings returned HTTP ${status}`,
        ![400, 401, 403, 404, 422].includes(status),
        status,
      );
    }

    const body = (await response.json()) as {
      model?: string;
      data?: { embedding?: number[]; index?: number }[];
      usage?: { total_tokens?: number };
    };
    const data = body.data;
    if (!Array.isArray(data) || data.length !== inputs.length) {
      throw new ProviderError(this.slug, "Unexpected embeddings response from OpenAI", false);
    }

    // Order is not guaranteed by the contract; sort by the returned index.
    const vectors = [...data]
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((d) => d.embedding ?? []);
    if (vectors.some((v) => v.length !== dimensions)) {
      throw new ProviderError(this.slug, "Embedding width did not match the schema", false);
    }

    return {
      vectors,
      model: body.model ?? "text-embedding-3-small",
      totalTokens: body.usage?.total_tokens ?? 0,
    };
  }
}