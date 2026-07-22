import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ScriptController } from "./script.controller";
import { ScriptService } from "./script.service";
import { ScriptRepository } from "./script.repository";

@Module({
  imports: [AiModule],
  controllers: [ScriptController],
  providers: [ScriptService, ScriptRepository],
  exports: [ScriptService],
})
export class ScriptModule {}
