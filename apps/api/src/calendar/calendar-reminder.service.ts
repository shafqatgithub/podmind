import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { EmailService } from "../email/email.service";
import type { Env } from "../config/env";

/**
 * Reminders for planned episodes.
 *
 * Two go out per slot. The first is early enough to be useful — three days
 * for a weekly or monthly show, twelve hours for a daily one, because three
 * days' notice on a daily show would arrive before the previous episode is
 * out. The second lands twelve hours before recording, and only for shows
 * where the first reminder was not already that close.
 *
 * Both carry one-click links. A host reading this on a phone should be able
 * to confirm or move a slot without signing in, so the token in the link is
 * the credential: single-use, expiring, scoped to one entry and one action.
 */

/** Hours before recording that the first reminder goes out. */
const EARLY_LEAD_HOURS: Record<string, number> = {
  daily: 12,
  weekly: 72,
  biweekly: 72,
  monthly: 72,
};

/** Hours before recording for the final nudge. */
const FINAL_LEAD_HOURS = 12;

/** How long an emailed action link stays valid. */
const TOKEN_TTL_HOURS = 14 * 24;

interface DueEntry {
  id: string;
  title: string;
  topic: string | null;
  notes: string | null;
  scheduled_for: string;
  cadence: string | null;
  project_title: string;
  email: string;
  full_name: string | null;
  stage: "early" | "final";
}

@Injectable()
export class CalendarReminderService {
  private readonly logger = new Logger(CalendarReminderService.name);
  private readonly appUrl: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get("APP_URL", { infer: true }).replace(/\/$/, "");
  }

  /**
   * Find and send every reminder that has come due.
   *
   * Each entry is marked as sent before the email goes out. Sending first and
   * marking after would mean a crash between the two steps re-sends on the
   * next tick — and a host who gets the same reminder four times stops
   * reading them.
   */
  async sendDue(): Promise<{ sent: number; skipped: number }> {
    if (!this.email.isConfigured) {
      this.logger.warn("reminders due but email is not configured");
      return { sent: 0, skipped: 0 };
    }

    const due = await this.findDue();
    let sent = 0;
    let skipped = 0;

    for (const entry of due) {
      const claimed = await this.claim(entry.id, entry.stage);
      if (!claimed) {
        // Another instance got there first.
        skipped += 1;
        continue;
      }

      const ok = await this.sendOne(entry);
      if (ok) sent += 1;
      else skipped += 1;
    }

    if (due.length > 0) this.logger.log({ due: due.length, sent, skipped });
    return { sent, skipped };
  }

  /**
   * Entries whose reminder window has opened.
   *
   * Published slots and those with reminders switched off are excluded, as
   * are entries already past — a reminder for yesterday is noise.
   */
  private async findDue(): Promise<DueEntry[]> {
    const { rows } = await this.pool.query<DueEntry>(
      `with entries as (
         select c.id, c.title, c.topic, c.notes, c.scheduled_for, c.cadence,
                c.reminder_sent_at, c.final_reminder_sent_at,
                p.title as project_title,
                u.email, u.full_name,
                -- Recording is treated as 09:00 local-naive; the column is a
                -- date, and a date alone gives nothing to count hours from.
                (c.scheduled_for::timestamptz + interval '9 hours') as recording_at
           from public.content_calendar c
           join public.projects p on p.id = c.project_id
           join public.workspaces w on w.id = p.workspace_id
           join public.profiles u on u.id = c.created_by
          where c.reminders_enabled
            and c.status <> 'published'
            and u.email is not null
            and u.is_active
       )
       select id, title, topic, notes, scheduled_for, cadence, project_title,
              email, full_name,
              case when final_due then 'final' else 'early' end as stage
         from (
           select *,
                  (final_reminder_sent_at is null
                   and recording_at - now() <= make_interval(hours => $1)
                   and recording_at > now()) as final_due,
                  (reminder_sent_at is null
                   and recording_at - now() <= make_interval(
                     hours => coalesce(
                       case cadence
                         when 'daily' then $2
                         when 'weekly' then $3
                         when 'biweekly' then $3
                         when 'monthly' then $3
                       end, $3)
                   )
                   and recording_at > now()) as early_due
             from entries
         ) scored
        where final_due or early_due
        order by scheduled_for`,
      [FINAL_LEAD_HOURS, EARLY_LEAD_HOURS.daily, EARLY_LEAD_HOURS.weekly],
    );
    return rows;
  }

  /**
   * Mark a reminder as sent, but only if it has not been already.
   *
   * The conditional update is the lock: two instances running the scheduler
   * cannot both claim the same reminder, because the second update matches no
   * rows.
   */
  private async claim(entryId: string, stage: "early" | "final"): Promise<boolean> {
    const column = stage === "final" ? "final_reminder_sent_at" : "reminder_sent_at";
    const { rowCount } = await this.pool.query(
      `update public.content_calendar
          set ${column} = now()
        where id = $1 and ${column} is null`,
      [entryId],
    );
    return rowCount === 1;
  }

  private async sendOne(entry: DueEntry): Promise<boolean> {
    const confirm = await this.issueToken(entry.id, "confirm");
    const reschedule = await this.issueToken(entry.id, "reschedule");

    const when = new Date(`${String(entry.scheduled_for).slice(0, 10)}T00:00:00Z`);
    const dayLabel = when.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });

    const isFinal = entry.stage === "final";
    const subject = isFinal
      ? `Tomorrow: ${entry.title}`
      : `${dayLabel}: ${entry.title}`;

    const confirmUrl = `${this.appUrl}/calendar/confirm?token=${confirm}`;
    const rescheduleUrl = `${this.appUrl}/calendar/reschedule?token=${reschedule}`;

    return this.email.send({
      to: entry.email,
      subject,
      html: this.renderHtml({ entry, dayLabel, isFinal, confirmUrl, rescheduleUrl }),
      text: [
        `${entry.title}`,
        `Scheduled for ${dayLabel} · ${entry.project_title}`,
        entry.topic ?? "",
        "",
        isFinal
          ? "This is the last reminder before recording."
          : "Confirm the slot or pick a new date:",
        `Confirm: ${confirmUrl}`,
        `Move it: ${rescheduleUrl}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  private renderHtml(input: {
    entry: DueEntry;
    dayLabel: string;
    isFinal: boolean;
    confirmUrl: string;
    rescheduleUrl: string;
  }): string {
    const { entry, dayLabel, isFinal, confirmUrl, rescheduleUrl } = input;
    const greeting = entry.full_name ? `Hi ${escapeHtml(entry.full_name.split(" ")[0]!)},` : "Hi,";

    return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;border:1px solid #e6eaf2;">
      <tr><td align="center" style="padding:28px 32px 4px 32px;">
        <img src="https://podmindai.com/logo-full-light.png" alt="PodMind AI" width="140" style="display:block;" />
      </td></tr>
      <tr><td style="padding:16px 32px 0 32px;">
        <p style="margin:0 0 12px 0;font-size:14px;color:#475467;">${greeting}</p>
        <p style="margin:0 0 4px 0;font-size:13px;color:#667085;">
          ${isFinal ? "Recording tomorrow" : "Coming up"} &middot; ${escapeHtml(entry.project_title)}
        </p>
        <h1 style="margin:0 0 8px 0;font-size:20px;line-height:1.3;color:#101828;">${escapeHtml(entry.title)}</h1>
        <p style="margin:0 0 16px 0;font-size:14px;color:#2E7FFF;font-weight:bold;">${escapeHtml(dayLabel)}</p>
        ${
          entry.topic
            ? `<p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#475467;">${escapeHtml(entry.topic)}</p>`
            : ""
        }
        ${
          entry.notes
            ? `<p style="margin:0 0 16px 0;padding:12px;background-color:#f8fafc;border-radius:8px;font-size:13px;line-height:20px;color:#475467;">${escapeHtml(entry.notes)}</p>`
            : ""
        }
      </td></tr>
      <tr><td align="center" style="padding:8px 32px 4px 32px;">
        <a href="${confirmUrl}" style="display:inline-block;background-color:#2E7FFF;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 32px;border-radius:8px;">
          ${isFinal ? "I'm ready" : "Confirm this date"}
        </a>
      </td></tr>
      <tr><td align="center" style="padding:12px 32px 0 32px;">
        <a href="${rescheduleUrl}" style="font-size:14px;color:#2E7FFF;text-decoration:none;">
          Can't make it? Pick another date
        </a>
      </td></tr>
      <tr><td align="center" style="padding:20px 32px 0 32px;">
        <p style="margin:0;font-size:12px;line-height:18px;color:#98a2b3;">
          Confirming keeps the slot and sends one last reminder the day before.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:20px 32px 26px 32px;border-top:1px solid #eef1f6;margin-top:20px;">
        <p style="margin:14px 0 0 0;font-size:12px;color:#98a2b3;">
          &copy; PodMind AI &middot; <a href="${this.appUrl}" style="color:#2E7FFF;text-decoration:none;">podmindai.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
  }

  /**
   * Issue a link token.
   *
   * Only the hash is stored. A leaked database then yields nothing usable,
   * which matters more than usual here because these tokens act without a
   * login behind them.
   */
  private async issueToken(entryId: string, purpose: "confirm" | "reschedule"): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await this.pool.query(
      `insert into public.calendar_action_tokens (entry_id, token_hash, purpose, expires_at)
       values ($1, $2, $3, now() + make_interval(hours => $4))`,
      [entryId, hashToken(token), purpose, TOKEN_TTL_HOURS],
    );
    return token;
  }

  /** Resolve a token to its entry, or explain why it cannot be used. */
  async resolveToken(token: string, purpose: "confirm" | "reschedule") {
    const { rows } = await this.pool.query<{
      id: string;
      entry_id: string;
      used_at: string | null;
      expired: boolean;
      title: string;
      scheduled_for: string;
      project_title: string;
    }>(
      `select t.id, t.entry_id, t.used_at, (t.expires_at < now()) as expired,
              c.title, c.scheduled_for, p.title as project_title
         from public.calendar_action_tokens t
         join public.content_calendar c on c.id = t.entry_id
         join public.projects p on p.id = c.project_id
        where t.token_hash = $1 and t.purpose = $2`,
      [hashToken(token), purpose],
    );

    const row = rows[0];
    if (!row) {
      throw new BadRequestException({
        code: "INVALID_TOKEN",
        message: "This link is not valid. Open the calendar in PodMind instead.",
      });
    }
    if (row.expired) {
      throw new BadRequestException({
        code: "EXPIRED_TOKEN",
        message: "This link has expired. Open the calendar in PodMind instead.",
      });
    }
    return row;
  }

  /** Confirm a slot from an emailed link. */
  async confirm(token: string) {
    const row = await this.resolveToken(token, "confirm");

    await this.pool.query(
      `update public.content_calendar
          set confirmed_at = now(),
              status = case when status = 'planned' then 'researching'
                            else status end
        where id = $1`,
      [row.entry_id],
    );
    await this.consume(row.id);

    return {
      confirmed: true,
      title: row.title,
      scheduled_for: row.scheduled_for,
      project_title: row.project_title,
    };
  }

  /**
   * Move a slot from an emailed link.
   *
   * Both reminder marks are cleared so the new date gets its own reminders —
   * without that, moving a slot two weeks out would leave the host with no
   * warning at all, having already "used up" the reminders on the old date.
   */
  async reschedule(token: string, newDate: string) {
    const row = await this.resolveToken(token, "reschedule");
    const day = newDate.slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "That date could not be read.",
      });
    }

    await this.pool.query(
      `update public.content_calendar
          set scheduled_for = $2::date,
              reminder_sent_at = null,
              final_reminder_sent_at = null,
              confirmed_at = null
        where id = $1`,
      [row.entry_id, day],
    );
    await this.consume(row.id);

    return {
      rescheduled: true,
      title: row.title,
      scheduled_for: day,
      project_title: row.project_title,
    };
  }

  private async consume(tokenId: string): Promise<void> {
    await this.pool.query(
      `update public.calendar_action_tokens set used_at = now() where id = $1`,
      [tokenId],
    );
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
