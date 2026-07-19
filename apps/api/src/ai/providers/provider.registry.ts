import { Injectable } from "@nestjs/common";
import { AnthropicProvider } from "./anthropic.provider";
import { GoogleProvider } from "./google.provider";
import { OpenAiProvider } from "./openai.provider";
import type { AiProvider, ProviderSlug } from "./provider.types";

/**
 * Provider Manager — the registry the Router selects from.
 * Adding a provider is: implement the adapter, register it here.
 */
@Injectable()
export class ProviderRegistry {
  private readonly providers = new Map<ProviderSlug, AiProvider>();

  constructor(
    openai: OpenAiProvider,
    anthropic: AnthropicProvider,
    google: GoogleProvider,
  ) {
    for (const provider of [openai, anthropic, google]) {
      this.providers.set(provider.slug, provider);
    }
  }

  get(slug: ProviderSlug): AiProvider | undefined {
    return this.providers.get(slug);
  }

  /** Providers with credentials — used by the Router and the status endpoint. */
  configured(): ProviderSlug[] {
    return [...this.providers.values()].filter((p) => p.isConfigured()).map((p) => p.slug);
  }

  all(): AiProvider[] {
    return [...this.providers.values()];
  }
}
