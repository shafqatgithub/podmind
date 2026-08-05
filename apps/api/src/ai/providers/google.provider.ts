import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BaseHttpProvider } from "./base-http.provider";
import {
  type CompletionOptions,
  type CompletionResult,
  ProviderError,
  type ProviderSlug,
  JSON_INSTRUCTION,
} from "./provider.types";
import type { Env } from "../../config/env";

/** Google Gemini adapter — generateContent API. */
@Injectable()
export class GoogleProvider extends BaseHttpProvider {
  readonly slug: ProviderSlug = "google";

  constructor(config: ConfigService<Env, true>) {
    super(config.get("GEMINI_API_KEY", { infer: true }));
  }

  supportsWebSearch(): boolean {
    return true;
  }

  protected buildRequest(options: CompletionOptions) {
    const system = options.messages.filter((m) => m.role === "system").map((m) => m.content);
    // Grounding and structured output cannot be combined, so when searching,
    // JSON is requested in words and recovered by the shared extractor.
    if (options.webSearch && options.jsonMode) system.push(JSON_INSTRUCTION);

    return {
      // Key travels in a header, never the URL, so it cannot leak into logs.
      url: `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`,
      headers: { "x-goog-api-key": this.apiKey ?? "" },
      body: {
        contents: options.messages
          .filter((m) => m.role !== "system")
          .map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        ...(system.length ? { systemInstruction: { parts: [{ text: system.join("\n\n") }] } } : {}),
        // Grounding with Google Search: the model decides when to search and
        // returns an answer with its sources already folded in.
        ...(options.webSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
          ...(options.jsonMode && !options.webSearch
            ? { responseMimeType: "application/json" }
            : {}),
        },
      },
    };
  }

  protected parseResponse(data: unknown, fallbackModel: string): CompletionResult {
    const body = data as {
      modelVersion?: string;
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const parts = body.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) {
      throw new ProviderError(this.slug, "Unexpected response shape from Gemini", false);
    }
    return {
      text: parts.map((p) => p.text ?? "").join(""),
      promptTokens: body.usageMetadata?.promptTokenCount ?? 0,
      completionTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      model: body.modelVersion ?? fallbackModel,
      provider: this.slug,
    };
  }
}
