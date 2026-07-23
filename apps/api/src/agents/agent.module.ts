import { Module } from "@nestjs/common";
import { ResearchModule } from "../research/research.module";
import { OutlineModule } from "../outlines/outline.module";
import { ScriptModule } from "../scripts/script.module";
import { SeoModule } from "../seo/seo.module";
import { SocialModule } from "../social/social.module";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentRepository } from "./agent.repository";

/**
 * The orchestrator composes the feature modules rather than reimplementing
 * them, so a pipeline step behaves exactly like running that module by hand —
 * same prompts, same credit metering, same persistence.
 */
@Module({
  imports: [ResearchModule, OutlineModule, ScriptModule, SeoModule, SocialModule],
  controllers: [AgentController],
  providers: [AgentService, AgentRepository],
  exports: [AgentService],
})
export class AgentModule {}
