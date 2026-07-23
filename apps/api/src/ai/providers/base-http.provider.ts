import { Logger } from "@nestjs/common";
import {
  type AiProvider,
  type CompletionOptions,
  type CompletionResult,
  ProviderError,
  type StreamEvent,
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
    /**
     * An object rather than unknown, because the streaming path merges the
     * provider's stream flags into it — which a spread cannot do to unknown.
     */
    body: Record<string, unknown>;
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

      const result = this.parseResponse(await response.json(), options.model);

      // A completion with no visible text is a failed attempt, not a result.
      // Reasoning models can spend the entire token budget on internal
      // reasoning and return nothing; treating that as success would save an
      // empty record and charge the user for it. Terminal, so the Router
      // moves straight to the next provider instead of paying twice.
      if (result.text.trim().length === 0) {
        throw new ProviderError(
          this.slug,
          `${this.slug} returned an empty completion (the token budget was consumed before any output was produced)`,
          false,
        );
      }
      return result;
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
  /**
   * Shared SSE reader.
   *
   * Providers differ in their event shape but all speak `data: {json}` lines
   * over the same transport, so the transport lives here and each provider
   * supplies only the shape-specific part. A provider that does not override
   * parseStreamChunk simply has no stream() and the Router uses complete().
   */
  protected parseStreamChunk?(data: unknown): StreamEvent | null;

  async *stream(options: CompletionOptions): AsyncIterable<StreamEvent> {
    if (!this.parseStreamChunk) {
      throw new ProviderError(this.slug, "streaming not supported", false);
    }
    if (!this.apiKey) {
      throw new ProviderError(this.slug, "no API key configured", false);
    }

    const request = this.buildRequest(options);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(request.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...request.headers },
        body: JSON.stringify({ ...request.body, ...this.streamBody() }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new ProviderError(
        this.slug,
        err instanceof Error ? err.message : "request failed",
        true,
      );
    }

    if (!response.ok || !response.body) {
      clearTimeout(timeout);
      const detail = await this.safeErrorText(response);
      throw new ProviderError(
        this.slug,
        detail,
        !BaseHttpProvider.TERMINAL_STATUSES.has(response.status),
        response.status,
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let produced = false;

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Events are separated by a blank line; a partial event stays in the
        // buffer until the rest of it arrives.
        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const rawEvent = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          for (const line of rawEvent.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            let parsed: unknown;
            try {
              parsed = JSON.parse(payload);
            } catch {
              continue; // A malformed frame is skipped, not fatal.
            }

            const event = this.parseStreamChunk(parsed);
            if (event) {
              if (event.type === "delta") produced = true;
              yield event;
            }
          }
        }
      }
    } finally {
      clearTimeout(timeout);
      reader.releaseLock();
    }

    // An empty stream is a failure, not an answer — the same rule complete()
    // applies, so the Router can fall back rather than saving an empty turn.
    if (!produced) {
      throw new ProviderError(this.slug, "provider returned an empty stream", false);
    }
  }

  /** Extra body fields that switch the provider into streaming mode. */
  protected streamBody(): Record<string, unknown> {
    return { stream: true };
  }

}
