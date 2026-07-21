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

export interface AiProvider {
  readonly slug: ProviderSlug;
  /** False when no API key is configured — the Router skips it in selection. */
  isConfigured(): boolean;
  complete(options: CompletionOptions): Promise<CompletionResult>;
  /** Optional: only providers with an embeddings API implement this. */
  embed?(inputs: string[], dimensions: number): Promise<EmbeddingResult>;
}
