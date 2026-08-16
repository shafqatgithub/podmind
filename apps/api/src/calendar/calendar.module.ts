import { Module } from "@nestjs/common";
import { AgentModule } from "../agents/agent.module";
import { AiModule } from "../ai/ai.module";
import { CalendarController } from "./calendar.controller";
import { CalendarService } from "./calendar.service";
import { CalendarRepository } from "./calendar.repository";
import { CalendarReminderService } from "./calendar-reminder.service";
import { CalendarReminderScheduler } from "./calendar-reminder.scheduler";

@Module({
  imports: [AgentModule, AiModule],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarRepository,
    CalendarReminderService,
    CalendarReminderScheduler,
  ],
  exports: [CalendarService],
})
export class CalendarModule {}
