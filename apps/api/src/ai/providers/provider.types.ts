/**
 * Provider contract — 17-AI-Router-Architecture "Provider Manager".
 *
 * Every provider adapter implements this one interface, which is what makes
 * the platform Provider Agnostic: the Router selects a provider by name and
 * never knows which vendor is behind it.
 */

export type AiTask =
  | "research"
  | "guest"
  | "outline"
  | "script"
  | "seo"
  | "social"
  | "summary"
  | "fact_check"
  | "translation"
  | "chat";

/** Matches the live `ai_provider` enum. */
export type ProviderSlug =
  | "openai"
  | "anthropic"
  | "google"
  | "grok"
  | "deepseek"
  | "mistral"
  | "ollama"
  | "custom";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model: string;
  messages: AiMessage[];
  /** Ask the provider for a strict JSON object where supported. */
  jsonMode?: boolean;
  /**
   * Ask the provider to search the web before answering.
   *
   * Only providers with a native search tool honour this; the Router checks
   * `supportsWebSearch` rather than assuming, because a provider that quietly
   * ignored it would return confident guesses dressed as current research.
   */
  webSearch?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Abort signal so callers can enforce their own deadlines. */
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: ProviderSlug;
}

/** Thrown by adapters; `retryable` drives the Router's retry/fallback logic. */
export class ProviderError extends Error {
  constructor(
    readonly provider: ProviderSlug,
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface EmbeddingResult {
  /** One vector per input, in the same order. */
  vectors: number[][];
  model: string;
  totalTokens: number;
}

/** One piece of a streamed answer, or the final accounting. */
export type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      promptTokens: number;
      completionTokens: number;
      model: string;
      /** Set by the Router, which knows which provider actually answered. */
      provider?: ProviderSlug;
    };

export interface AiProvider {
  readonly slug: ProviderSlug;
  /** False when no API key is configured — the Router skips it in selection. */
  isConfigured(): boolean;
  /** True when this provider can ground an answer in live web results. */
  supportsWebSearch?(): boolean;
  complete(options: CompletionOptions): Promise<CompletionResult>;
  /** Optional: only providers with an embeddings API implement this. */
  embed?(inputs: string[], dimensions: number): Promise<EmbeddingResult>;
  /**
   * Optional: providers that can stream token by token implement this. The
   * Router falls back to complete() for those that do not, so a provider
   * without streaming still answers — just all at once.
   */
  stream?(options: CompletionOptions): AsyncIterable<StreamEvent>;
}
