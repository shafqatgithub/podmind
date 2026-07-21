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

  protected buildRequest(options: CompletionOptions) {
    const reasoning = OpenAiProvider.isReasoningModel(options.model);
    const maxTokens = options.maxTokens ?? 4096;

    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { authorization: `Bearer ${this.apiKey}` },
      body: {
        model: options.model,
        messages: options.messages,
        ...(reasoning
          ? { max_completion_tokens: maxTokens }
          : { max_tokens: maxTokens, temperature: options.temperature ?? 0.7 }),
        ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      },
    };
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
}
