import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { FactCheckController } from "./fact-check.controller";
import { FactCheckService } from "./fact-check.service";
import { FactCheckRepository } from "./fact-check.repository";

@Module({
  imports: [AiModule],
  controllers: [FactCheckController],
  providers: [FactCheckService, FactCheckRepository],
  exports: [FactCheckService],
})
export class FactCheckModule {}
