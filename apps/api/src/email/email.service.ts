import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env";

/**
 * Transactional email.
 *
 * Kept deliberately small — one send method over Resend's HTTP API rather
 * than an SDK, because the surface used here is a single endpoint and a
 * dependency that has to be kept in step is a poor trade for it.
 *
 * When no API key is configured, sending is a logged no-op instead of an
 * error: a deployment without email should still run everything else, and a
 * reminder that could not be sent must not take down the job that tried.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey?: string;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get("RESEND_API_KEY", { infer: true });
    this.from = config.get("EMAIL_FROM", { infer: true });
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Send one email. Returns whether it was accepted.
   *
   * Never throws: callers are background jobs, and a provider outage should
   * postpone a reminder, not crash the run that was sending it.
   */
  async send(input: {
    to: string;
    subject: string;
    html: string;
    /** Plain-text alternative. Worth sending: some clients show only this. */
    text?: string;
  }): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn({ message: "email not configured; skipping send", to: input.to });
      return false;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          ...(input.text ? { text: input.text } : {}),
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        this.logger.error({
          message: "email send rejected",
          status: response.status,
          detail: detail.slice(0, 300),
        });
        return false;
      }

      this.logger.log({ message: "email sent", to: input.to, subject: input.subject });
      return true;
    } catch (err) {
      this.logger.error({
        message: "email send failed",
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }
}
