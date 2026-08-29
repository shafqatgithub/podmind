import { Injectable, Logger } from "@nestjs/common";
import { DodoRepository } from "./dodo.repository";

/**
 * Dodo Payments webhook handling.
 *
 * Dodo is the merchant of record, so it — not us — knows what was charged,
 * refunded or put on hold. These handlers translate that into our own
 * subscription and credit state, and nothing else grants a paid plan.
 *
 * Same two rules as the Paddle handler:
 * - Every event is claimed by id first, since a retried delivery must not
 *   grant credits twice.
 * - An unrecognised event type is acknowledged rather than failed, so Dodo
 *   does not retry forever for something we never subscribed to caring about.
 */

interface DodoEvent {
  business_id?: string;
  type?: string;
  timestamp?: string;
  data?: Record<string, unknown>;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Dodo's product_cart carries product_id per line item. */
function firstProductId(data: Record<string, unknown>): string | null {
  const cart = data.product_cart ?? data.product_id;
  if (typeof cart === "string") return cart;
  if (Array.isArray(cart)) {
    for (const item of cart) {
      if (item && typeof item === "object") {
        const id = str((item as Record<string, unknown>).product_id);
        if (id) return id;
      }
    }
  }
  return null;
}

export type WebhookOutcome =
  | { handled: true; action: string }
  | { handled: false; reason: string };

@Injectable()
export class DodoWebhookService {
  private readonly logger = new Logger(DodoWebhookService.name);

  constructor(private readonly repository: DodoRepository) {}

  async handle(event: DodoEvent): Promise<WebhookOutcome> {
    // Dodo events don't carry a separate event id field the way Paddle does;
    // subscription/payment id + type + timestamp together identify a unique
    // delivery for idempotency purposes.
    const data = event.data ?? {};
    const subjectId = str(data.subscription_id) ?? str(data.payment_id) ?? str(data.id);
    const eventType = str(event.type);
    const eventId = subjectId && eventType ? `${eventType}:${subjectId}:${event.timestamp ?? ""}` : null;

    if (!eventId || !eventType) {
      return { handled: false, reason: "missing event id or type" };
    }

    const claimed = await this.repository.claimEvent(eventId, eventType, event);
    if (!claimed) {
      return { handled: true, action: "duplicate ignored" };
    }

    try {
      switch (eventType) {
        case "subscription.active":
        case "subscription.updated":
          return await this.applySubscription(data, "active");

        case "subscription.on_hold":
          return await this.applySubscription(data, "past_due");

        case "subscription.failed":
        case "subscription.cancelled":
        case "subscription.expired":
          return await this.changeStatus(
            data,
            eventType === "subscription.expired" ? "canceled" : eventType.split(".")[1] ?? "canceled",
          );

        case "payment.succeeded":
          return await this.recordPayment(data);

        default:
          return { handled: true, action: `ignored ${eventType}` };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "handler failed";
      this.logger.error({ eventId, eventType, err }, "dodo webhook failed");
      await this.repository.releaseEvent(eventId).catch(() => undefined);
      throw new Error(message);
    }
  }

  private async applySubscription(
    data: Record<string, unknown>,
    status: string,
  ): Promise<WebhookOutcome> {
    const subscriptionId = str(data.subscription_id) ?? str(data.id);
    const customer = data.customer as Record<string, unknown> | undefined;
    const customerId = str(data.customer_id) ?? (customer ? str(customer.customer_id) : null);
    const productId = firstProductId(data);

    if (!subscriptionId || !customerId || !productId) {
      return { handled: false, reason: "subscription payload missing id, customer or product" };
    }

    const plan = await this.repository.planForProduct(productId);
    if (!plan) {
      this.logger.warn({ productId }, "no plan mapped to dodo product");
      return { handled: false, reason: `no plan mapped to product ${productId}` };
    }

    const organizationId =
      this.metadataOrganization(data) ??
      (await this.repository.organizationForCustomer(customerId));

    if (!organizationId) {
      return { handled: false, reason: "could not attribute subscription to an organization" };
    }

    await this.repository.applySubscription({
      organizationId,
      planId: plan.plan_id,
      status,
      billingCycle: plan.billing_cycle,
      customerId,
      subscriptionId,
      currentPeriodStart: str(data.previous_billing_date) ?? str(data.created_at),
      currentPeriodEnd: str(data.next_billing_date),
      cancelAtPeriodEnd: data.cancel_at_next_billing_date === true,
      // Credits are granted only when the subscription is actually live.
      creditsToGrant: status === "active" ? plan.ai_credits : null,
    });

    return { handled: true, action: `subscription ${status} on ${plan.slug}` };
  }

  private async changeStatus(
    data: Record<string, unknown>,
    status: string,
  ): Promise<WebhookOutcome> {
    const subscriptionId = str(data.subscription_id) ?? str(data.id);
    if (!subscriptionId) return { handled: false, reason: "missing subscription id" };

    await this.repository.markSubscriptionStatus(subscriptionId, status, status === "canceled");
    return { handled: true, action: `subscription ${status}` };
  }

  private async recordPayment(data: Record<string, unknown>): Promise<WebhookOutcome> {
    const customer = data.customer as Record<string, unknown> | undefined;
    const customerId = str(data.customer_id) ?? (customer ? str(customer.customer_id) : null);
    if (!customerId) return { handled: false, reason: "missing customer id" };

    const organizationId =
      this.metadataOrganization(data) ??
      (await this.repository.organizationForCustomer(customerId));
    if (!organizationId) {
      return { handled: false, reason: "could not attribute payment to an organization" };
    }

    // Dodo reports the total in the smallest currency unit, same as Paddle.
    const rawTotal = data.total_amount ?? data.amount;
    const amount = Number(rawTotal ?? 0) / 100;

    await this.repository.recordInvoice({
      organizationId,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: str(data.currency) ?? "USD",
      status: "paid",
      invoiceNumber: str(data.payment_id) ?? str(data.invoice_id),
      paidAt: str(data.created_at) ?? new Date().toISOString(),
    });

    await this.repository.linkCustomer(organizationId, customerId);
    return { handled: true, action: "payment recorded" };
  }

  /**
   * The organization id is passed through Dodo's metadata at checkout
   * creation, which is more reliable than looking a customer up after the
   * fact — on a first purchase there is no prior row to match against.
   */
  private metadataOrganization(data: Record<string, unknown>): string | null {
    const metadata = data.metadata;
    if (metadata && typeof metadata === "object") {
      return str((metadata as Record<string, unknown>).organization_id);
    }
    return null;
  }
}
