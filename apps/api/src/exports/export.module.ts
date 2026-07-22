import { Module } from "@nestjs/common";
import { ScriptModule } from "../scripts/script.module";
import { OutlineModule } from "../outlines/outline.module";
import { ResearchModule } from "../research/research.module";
import { ScriptRepository } from "../scripts/script.repository";
import { OutlineRepository } from "../outlines/outline.repository";
import { ResearchRepository } from "../research/research.repository";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";

@Module({
  imports: [ScriptModule, OutlineModule, ResearchModule],
  controllers: [ExportController],
  providers: [ExportService, ScriptRepository, OutlineRepository, ResearchRepository],
})
export class ExportModule {}
