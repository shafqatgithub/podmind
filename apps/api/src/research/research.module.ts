import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";
import { ResearchRepository } from "./research.repository";

@Module({
  imports: [AiModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository],
  exports: [ResearchService],
})
export class ResearchModule {}
