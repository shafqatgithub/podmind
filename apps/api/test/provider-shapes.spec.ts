import type { ConfigService } from "@nestjs/config";
import { OpenAiProvider } from "../src/ai/providers/openai.provider";
import { AnthropicProvider } from "../src/ai/providers/anthropic.provider";
import { GoogleProvider } from "../src/ai/providers/google.provider";
import type { CompletionOptions } from "../src/ai/providers/provider.types";
import type { Env } from "../src/config/env";

/**
 * Provider request shapes.
 *
 * Adapters only fail at the provider's edge, which no unit test reaches, so
 * these assertions pin the payload each API actually accepts. They exist
 * because a live run was rejected with
 *   "'max_tokens' is not supported with this model. Use 'max_completion_tokens'"
 * after GPT-5 renamed the field and stopped accepting a custom temperature.
 */

/** Minimal ConfigService stand-in typed to the app's env shape. */
function configWith(values: Record<string, string>) {
  return { get: (key: string) => values[key] } as unknown as ConfigService<Env, true>;
}

/** buildRequest is protected; tests exercise it as the adapter's contract. */
function build(provider: object, options: CompletionOptions) {
  return (
    provider as { buildRequest(o: CompletionOptions): { url: string; body: Record<string, unknown> } }
  ).buildRequest(options);
}

const baseOptions: CompletionOptions = {
  model: "",
  messages: [
    { role: "system", content: "You are precise." },
    { role: "user", content: "Research this topic." },
  ],
  maxTokens: 4000,
  temperature: 0.4,
};

describe("Provider request shapes", () => {
  describe("OpenAI", () => {
    const provider = new OpenAiProvider(configWith({ OPENAI_API_KEY: "test-key" }));

    it.each(["gpt-5", "gpt-5-mini", "o3"])(
      "sends max_completion_tokens and omits temperature for %s",
      (model) => {
        const { body } = build(provider, { ...baseOptions, model });
        expect(body.max_completion_tokens).toBe(4000);
        expect(body).not.toHaveProperty("max_tokens");
        // Reasoning models accept only the default temperature.
        expect(body).not.toHaveProperty("temperature");
      },
    );

    it("keeps the legacy parameters for older chat models", () => {
      const { body } = build(provider, { ...baseOptions, model: "gpt-4o" });
      expect(body.max_tokens).toBe(4000);
      expect(body.temperature).toBe(0.4);
      expect(body).not.toHaveProperty("max_completion_tokens");
    });

    it("requests strict JSON when asked", () => {
      const { body } = build(provider, { ...baseOptions, model: "gpt-5", jsonMode: true });
      expect(body.response_format).toEqual({ type: "json_object" });
    });
  });

  describe("Anthropic", () => {
    const provider = new AnthropicProvider(configWith({ ANTHROPIC_API_KEY: "test-key" }));

    it("lifts system messages into the top-level system field", () => {
      const { body, headers } = build(provider, {
        ...baseOptions,
        model: "claude-opus-4-8",
      }) as unknown as { body: Record<string, unknown>; headers: Record<string, string> };

      expect(body.system).toContain("You are precise.");
      expect(body.messages).toEqual([{ role: "user", content: "Research this topic." }]);
      expect(body.max_tokens).toBe(4000);
      expect(headers["anthropic-version"]).toBe("2023-06-01");
    });

    it("appends a JSON instruction to the system prompt in json mode", () => {
      const { body } = build(provider, {
        ...baseOptions,
        model: "claude-opus-4-8",
        jsonMode: true,
      });
      expect(String(body.system)).toMatch(/JSON object only/i);
    });
  });

  describe("Google", () => {
    const provider = new GoogleProvider(configWith({ GEMINI_API_KEY: "test-key" }));

    it("uses systemInstruction, maps roles, and keeps the key out of the URL", () => {
      const { url, body, headers } = build(provider, {
        ...baseOptions,
        model: "gemini-2.5-flash",
      }) as unknown as {
        url: string;
        body: Record<string, unknown>;
        headers: Record<string, string>;
      };

      expect(url).toContain("gemini-2.5-flash:generateContent");
      expect(url).not.toContain("test-key");
      expect(headers["x-goog-api-key"]).toBe("test-key");
      expect(body.systemInstruction).toBeDefined();
      expect(body.contents).toEqual([
        { role: "user", parts: [{ text: "Research this topic." }] },
      ]);
    });

    it("asks for a JSON mime type in json mode", () => {
      const { body } = build(provider, {
        ...baseOptions,
        model: "gemini-2.5-flash",
        jsonMode: true,
      });
      expect((body.generationConfig as Record<string, unknown>).responseMimeType).toBe(
        "application/json",
      );
    });
  });
});
