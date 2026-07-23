import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { SeoController } from "./seo.controller";
import { SeoService } from "./seo.service";
import { SeoRepository } from "./seo.repository";

@Module({
  imports: [AiModule],
  controllers: [SeoController],
  providers: [SeoService, SeoRepository],
  exports: [SeoService],
})
export class SeoModule {}
