import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeController } from "./knowledge.controller";
import { KnowledgeService } from "./knowledge.service";
import { KnowledgeRepository } from "./knowledge.repository";

@Module({
  imports: [AiModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, KnowledgeRepository],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
