import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { OutlineController } from "./outline.controller";
import { OutlineService } from "./outline.service";
import { OutlineRepository } from "./outline.repository";

@Module({
  imports: [AiModule],
  controllers: [OutlineController],
  providers: [OutlineService, OutlineRepository],
  exports: [OutlineService, OutlineRepository],
})
export class OutlineModule {}
