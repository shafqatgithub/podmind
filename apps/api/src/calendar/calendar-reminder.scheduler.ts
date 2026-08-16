import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CalendarReminderService } from "./calendar-reminder.service";
import type { Env } from "../config/env";

/**
 * Ticks every fifteen minutes looking for reminders that have come due.
 *
 * Fifteen minutes rather than hourly because the final reminder is a
 * twelve-hour lead: an hourly tick would let it drift to eleven, which for a
 * host planning an evening recording is the difference between useful and
 * pointless. The query is indexed and matches almost nothing most of the
 * time, so the cost of the extra ticks is negligible.
 *
 * Guarded by a flag, off by default. Two API instances both running this
 * would race, and while the reminder claim is atomic — so nobody gets a
 * duplicate email — the safer default for a background job that contacts
 * users is not to run at all until it is deliberately switched on.
 */
@Injectable()
export class CalendarReminderScheduler {
  private readonly logger = new Logger(CalendarReminderScheduler.name);
  private readonly enabled: boolean;
  /** Guards against a slow run overlapping the next tick. */
  private running = false;

  constructor(
    private readonly reminders: CalendarReminderService,
    config: ConfigService<Env, true>,
  ) {
    this.enabled = config.get("REMINDERS_ENABLED", { infer: true });
    if (this.enabled) this.logger.log("calendar reminders are enabled");
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick(): Promise<void> {
    if (!this.enabled || this.running) return;

    this.running = true;
    try {
      await this.reminders.sendDue();
    } catch (err) {
      // Never rethrow from a scheduled job: an unhandled rejection here
      // would take the process down over a reminder.
      this.logger.error({
        message: "reminder run failed",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.running = false;
    }
  }
}
