import { Module } from "@nestjs/common";
import { ScriptModule } from "../scripts/script.module";
import { OutlineModule } from "../outlines/outline.module";
import { ResearchModule } from "../research/research.module";
import { ScriptRepository } from "../scripts/script.repository";
import { OutlineRepository } from "../outlines/outline.repository";
import { ResearchRepository } from "../research/research.repository";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { ExportTranslator } from "./export.translator";
import { SeoRepository } from "../seo/seo.repository";
import { SocialRepository } from "../social/social.repository";
import { SocialModule } from "../social/social.module";
import { SeoModule } from "../seo/seo.module";
import { AiModule } from "../ai/ai.module";

@Module({
  imports: [ScriptModule, OutlineModule, ResearchModule, SeoModule, SocialModule, AiModule],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportTranslator,
    ScriptRepository,
    OutlineRepository,
    ResearchRepository,
    SeoRepository,
    SocialRepository,
  ],
})
export class ExportModule {}
