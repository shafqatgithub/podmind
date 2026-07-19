import { Module } from "@nestjs/common";
import { AnthropicProvider } from "./providers/anthropic.provider";
import { GoogleProvider } from "./providers/google.provider";
import { OpenAiProvider } from "./providers/openai.provider";
import { ProviderRegistry } from "./providers/provider.registry";
import { ModelCatalog } from "./routing/model-catalog";
import { AiRouterService } from "./routing/ai-router.service";
import { CreditsService } from "./credits/credits.service";
import { AiController } from "./ai.controller";

/**
 * AI module — Router, Provider Manager, Model Catalog and credit metering.
 * Feature modules (Research, Chat, SEO…) depend only on AiRouterService.
 */
@Module({
  controllers: [AiController],
  providers: [
    OpenAiProvider,
    AnthropicProvider,
    GoogleProvider,
    ProviderRegistry,
    ModelCatalog,
    CreditsService,
    AiRouterService,
  ],
  exports: [AiRouterService, CreditsService, ProviderRegistry],
})
export class AiModule {}
