import { Module } from "@nestjs/common";
import { AgentModule } from "../agents/agent.module";
import { AiModule } from "../ai/ai.module";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { CalendarRepository } from "./calendar.repository";

@Module({
  imports: [AgentModule, AiModule],
  controllers: [CalendarController],
  providers: [CalendarService, CalendarRepository],
  exports: [CalendarService],
})
export class CalendarModule {}
