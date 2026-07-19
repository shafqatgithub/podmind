import { Logger } from "@nestjs/common";
import {
  type AiProvider,
  type CompletionOptions,
  type CompletionResult,
  ProviderError,
  type ProviderSlug,
} from "./provider.types";

/**
 * Shared HTTP plumbing for provider adapters: request timeout, JSON parsing,
 * and error classification (retryable vs terminal). Adapters only implement
 * "build the request" and "read the response", which keeps each one small
 * and makes adding a provider a ~40-line change.
 */
export abstract class BaseHttpProvider implements AiProvider {
  abstract readonly slug: ProviderSlug;
  protected readonly logger = new Logger(this.constructor.name);
  /** Providers that never heal within a request: auth, bad request, not found. */
  private static readonly TERMINAL_STATUSES = new Set([400, 401, 403, 404, 422]);

  constructor(
    protected readonly apiKey: string | undefined,
    private readonly timeoutMs = 120_000,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  protected abstract buildRequest(options: CompletionOptions): {
    url: string;
    headers: Record<string, string>;
    body: unknown;
  };

  protected abstract parseResponse(data: unknown, fallbackModel: string): CompletionResult;

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new ProviderError(this.slug, `${this.slug} has no API key configured`, false);
    }

    const { url, headers, body } = this.buildRequest(options);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const onExternalAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onExternalAbort);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await this.safeErrorText(response);
        throw new ProviderError(
          this.slug,
          detail,
          !BaseHttpProvider.TERMINAL_STATUSES.has(response.status),
          response.status,
        );
      }

      return this.parseResponse(await response.json(), options.model);
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ProviderError(this.slug, "Provider request timed out", true);
      }
      throw new ProviderError(
        this.slug,
        err instanceof Error ? err.message : "Provider request failed",
        true,
      );
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  /** Surface the provider's message without leaking keys or headers. */
  private async safeErrorText(response: Response): Promise<string> {
    if (response.status === 401 || response.status === 403) {
      return `${this.slug} rejected the API key`;
    }
    try {
      const body = (await response.json()) as { error?: { message?: string }; message?: string };
      return body.error?.message ?? body.message ?? `${this.slug} returned HTTP ${response.status}`;
    } catch {
      return `${this.slug} returned HTTP ${response.status}`;
    }
  }

  /** Defensive JSON extraction — models sometimes fence or prefix output. */
  static extractJson(text: string): Record<string, unknown> | null {
    const candidates = [text.trim(), text.replace(/^```(?:json)?|```$/gm, "").trim()];
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));

    for (const candidate of candidates) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        continue;
      }
    }
    return null;
  }
}
