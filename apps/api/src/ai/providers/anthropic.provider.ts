import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseHttpProvider } from "./base-http.provider";
import {
  type CompletionOptions,
  type CompletionResult,
  ProviderError,
  type ProviderSlug,
} from "./provider.types";
import type { Env } from "../../config/env";

const JSON_INSTRUCTION =
  "Respond with a single valid JSON object only — no prose, no markdown fences.";

/** Anthropic Claude adapter — Messages API (system prompt is a top-level field). */
@Injectable()
export class AnthropicProvider extends BaseHttpProvider {
  readonly slug: ProviderSlug = "anthropic";

  constructor(config: ConfigService<Env, true>) {
    super(config.get("ANTHROPIC_API_KEY", { infer: true }));
  }

  protected buildRequest(options: CompletionOptions) {
    const systemParts = options.messages.filter((m) => m.role === "system").map((m) => m.content);
    if (options.jsonMode) systemParts.push(JSON_INSTRUCTION);

    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: {
        "x-api-key": this.apiKey ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        messages: options.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
        ...(systemParts.length ? { system: systemParts.join("\n\n") } : {}),
      },
    };
  }

  protected parseResponse(data: unknown, fallbackModel: string): CompletionResult {
    const body = data as {
      model?: string;
      content?: { type?: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    if (!Array.isArray(body.content)) {
      throw new ProviderError(this.slug, "Unexpected response shape from Anthropic", false);
    }
    return {
      text: body.content
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join(""),
      promptTokens: body.usage?.input_tokens ?? 0,
      completionTokens: body.usage?.output_tokens ?? 0,
      model: body.model ?? fallbackModel,
      provider: this.slug,
    };
  }
}
