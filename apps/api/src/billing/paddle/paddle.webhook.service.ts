import { Injectable, Logger } from "@nestjs/common";
import { PaddleRepository } from "./paddle.repository";

/**
 * Paddle webhook handling.
 *
 * Paddle is the merchant of record, so it — not us — knows what was charged,
 * refunded or cancelled. These handlers translate that into our own
 * subscription and credit state, and nothing else grants a paid plan.
 *
 * Two rules run through all of it:
 *
 * - Every event is claimed by id first, because Paddle retries until it gets
 *   a 2xx and a replayed transaction would otherwise grant credits twice.
 * - An event we do not recognise is acknowledged rather than failed. Paddle
 *   sends event types we never subscribed to caring about; returning an error
 *   would make it retry forever for no reason.
 */

interface PaddleEvent {
  event_id?: string;
  event_type?: string;
  data?: Record<string, unknown>;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Paddle nests the price inside items[].price. */
function firstPriceId(data: Record<string, unknown>): string | null {
  const items = data.items;
  if (!Array.isArray(items)) return null;
  for (const item of items) {
    if (item && typeof item === "object") {
      const price = (item as Record<string, unknown>).price;
      if (price && typeof price === "object") {
        const id = str((price as Record<string, unknown>).id);
        if (id) return id;
      }
      const priceId = str((item as Record<string, unknown>).price_id);
      if (priceId) return priceId;
    }
  }
  return null;
}

export type WebhookOutcome =
  | { handled: true; action: string }
  | { handled: false; reason: string };

@Injectable()
export class PaddleWebhookService {
  private readonly logger = new Logger(PaddleWebhookService.name);

  constructor(private readonly repository: PaddleRepository) {}

  async handle(event: PaddleEvent): Promise<WebhookOutcome> {
    const eventId = str(event.event_id);
    const eventType = str(event.event_type);
    const data = event.data ?? {};

    if (!eventId || !eventType) {
      return { handled: false, reason: "missing event id or type" };
    }

    const claimed = await this.repository.claimEvent(eventId, eventType, event);
    if (!claimed) {
      // Already processed — a retry, which is normal.
      return { handled: true, action: "duplicate ignored" };
    }

    try {
      switch (eventType) {
        case "subscription.created":
        case "subscription.updated":
        case "subscription.activated":
          return await this.applySubscription(data);

        case "subscription.canceled":
        case "subscription.paused":
          return await this.changeStatus(data, eventType === "subscription.paused" ? "paused" : "canceled");

        case "transaction.completed":
          return await this.recordPayment(data);

        default:
          return { handled: true, action: `ignored ${eventType}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "handler failed";
      this.logger.error({ eventId, eventType, err }, "paddle webhook failed");
      // Release the claim so Paddle's retry is processed rather than skipped
      // as a duplicate, then let the caller return a non-2xx.
      await this.repository.releaseEvent(eventId).catch(() => undefined);
      throw new Error(message);
    }
  }

  private async applySubscription(data: Record<string, unknown>): Promise<WebhookOutcome> {
    const subscriptionId = str(data.id);
    const customerId = str(data.customer_id);
    const priceId = firstPriceId(data);

    if (!subscriptionId || !customerId || !priceId) {
      return { handled: false, reason: "subscription payload missing id, customer or price" };
    }

    const plan = await this.repository.planForPrice(priceId);
    if (!plan) {
      // A price we do not know about must not silently upgrade anyone.
      this.logger.warn({ priceId }, "no plan mapped to paddle price");
      return { handled: false, reason: `no plan mapped to price ${priceId}` };
    }

    const organizationId =
      str(this.customDataOrganization(data)) ??
      (await this.repository.organizationForCustomer(customerId));

    if (!organizationId) {
      return { handled: false, reason: "could not attribute subscription to an organization" };
    }

    const period = (data.current_billing_period ?? {}) as Record<string, unknown>;
    const status = str(data.status) ?? "active";

    await this.repository.applySubscription({
      organizationId,
      planId: plan.plan_id,
      status,
      billingCycle: plan.billing_cycle,
      customerId,
      subscriptionId,
      currentPeriodStart: str(period.starts_at),
      currentPeriodEnd: str(period.ends_at),
      cancelAtPeriodEnd: data.scheduled_change !== null && data.scheduled_change !== undefined,
      // Credits are granted only when the subscription is actually live.
      creditsToGrant: status === "active" ? plan.ai_credits : null,
    });

    return { handled: true, action: `subscription ${status} on ${plan.slug}` };
  }

  private async changeStatus(
    data: Record<string, unknown>,
    status: string,
  ): Promise<WebhookOutcome> {
    const subscriptionId = str(data.id);
    if (!subscriptionId) return { handled: false, reason: "missing subscription id" };

    await this.repository.markSubscriptionStatus(subscriptionId, status, status === "canceled");
    return { handled: true, action: `subscription ${status}` };
  }

  private async recordPayment(data: Record<string, unknown>): Promise<WebhookOutcome> {
    const customerId = str(data.customer_id);
    if (!customerId) return { handled: false, reason: "missing customer id" };

    const organizationId =
      str(this.customDataOrganization(data)) ??
      (await this.repository.organizationForCustomer(customerId));
    if (!organizationId) {
      return { handled: false, reason: "could not attribute payment to an organization" };
    }

    const details = (data.details ?? {}) as Record<string, unknown>;
    const totals = (details.totals ?? {}) as Record<string, unknown>;

    // Paddle reports money in the smallest currency unit as a string.
    const rawTotal = str(totals.grand_total) ?? "0";
    const amount = Number(rawTotal) / 100;

    await this.repository.recordInvoice({
      organizationId,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: str(totals.currency_code) ?? str(data.currency_code) ?? "USD",
      status: "paid",
      invoiceNumber: str(data.invoice_number),
      paidAt: str(data.billed_at) ?? new Date().toISOString(),
    });

    await this.repository.linkCustomer(organizationId, customerId);
    return { handled: true, action: "payment recorded" };
  }

  /**
   * The organization id is passed through Paddle's custom_data at checkout,
   * which is more reliable than looking a customer up after the fact — on a
   * first purchase there is no prior row to match against.
   */
  private customDataOrganization(data: Record<string, unknown>): string | null {
    const custom = data.custom_data;
    if (custom && typeof custom === "object") {
      return str((custom as Record<string, unknown>).organization_id);
    }
    return null;
  }
}
