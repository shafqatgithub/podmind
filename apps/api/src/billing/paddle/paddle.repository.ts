import { Inject, Injectable } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../../database/database.module";

export interface PlanMatch {
  plan_id: string;
  slug: string;
  name: string;
  ai_credits: number | null;
  billing_cycle: "monthly" | "yearly";
}

@Injectable()
export class PaddleRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Claim an event id. Returns false if it was already processed.
   *
   * Paddle retries until it receives a 2xx, so duplicates are routine rather
   * than exceptional. The primary key does the work: a losing insert means
   * some other delivery already handled this event.
   */
  async claimEvent(
    eventId: string,
    eventType: string,
    payload: unknown,
  ): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `insert into public.payment_webhook_events (event_id, event_type, payload)
       values ($1,$2,$3)
       on conflict (event_id) do nothing`,
      [eventId, eventType, JSON.stringify(payload)],
    );
    return rowCount === 1;
  }

  async recordEventError(eventId: string, message: string): Promise<void> {
    await this.pool.query(
      `update public.payment_webhook_events set error_message = $2 where event_id = $1`,
      [eventId, message.slice(0, 1000)],
    );
  }

  /** Release a claim so Paddle's retry can be processed rather than skipped. */
  async releaseEvent(eventId: string): Promise<void> {
    await this.pool.query(`delete from public.payment_webhook_events where event_id = $1`, [
      eventId,
    ]);
  }

  /** Which plan and cycle does this Paddle price correspond to? */
  async planForPrice(priceId: string): Promise<PlanMatch | null> {
    const { rows } = await this.pool.query<PlanMatch>(
      `select id as plan_id, slug, name, ai_credits,
              case when paddle_price_id_yearly = $1 then 'yearly' else 'monthly' end
                as billing_cycle
         from public.subscription_plans
        where paddle_price_id_monthly = $1 or paddle_price_id_yearly = $1
        limit 1`,
      [priceId],
    );
    return rows[0] ?? null;
  }

  /** Resolve the organization a Paddle customer belongs to. */
  async organizationForCustomer(customerId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ organization_id: string }>(
      `select organization_id from public.organization_subscriptions
        where provider_customer_id = $1
        order by created_at desc limit 1`,
      [customerId],
    );
    return rows[0]?.organization_id ?? null;
  }

  /**
   * Write the subscription and top up credits in one transaction, so a
   * customer is never left on a paid plan without the credits they bought,
   * or vice versa.
   */
  async applySubscription(input: {
    organizationId: string;
    planId: string;
    status: string;
    billingCycle: string;
    customerId: string;
    subscriptionId: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    creditsToGrant: number | null;
  }): Promise<void> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      await client.query(
        `insert into public.organization_subscriptions
           (organization_id, plan_id, status, billing_cycle,
            current_period_start, current_period_end, cancel_at_period_end,
            provider_customer_id, provider_subscription_id)
         values ($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,$7,$8,$9)
         on conflict (organization_id) do update
            set plan_id                  = excluded.plan_id,
                status                   = excluded.status,
                billing_cycle            = excluded.billing_cycle,
                current_period_start     = excluded.current_period_start,
                current_period_end       = excluded.current_period_end,
                cancel_at_period_end     = excluded.cancel_at_period_end,
                provider_customer_id     = excluded.provider_customer_id,
                provider_subscription_id = excluded.provider_subscription_id,
                updated_at               = now()`,
        [
          input.organizationId,
          input.planId,
          input.status,
          input.billingCycle,
          input.currentPeriodStart,
          input.currentPeriodEnd,
          input.cancelAtPeriodEnd,
          input.customerId,
          input.subscriptionId,
        ],
      );

      if (input.creditsToGrant && input.creditsToGrant > 0) {
        // update_ai_credit_usage only fires for 'usage' rows, so a purchase
        // has to move the balance itself — exactly as refunds do.
        await client.query(
          `insert into public.ai_credit_balances
             (organization_id, available_credits, used_credits, purchased_credits)
           values ($1, 0, 0, 0)
           on conflict (organization_id) do nothing`,
          [input.organizationId],
        );
        await client.query(
          `update public.ai_credit_balances
              set available_credits = available_credits + $2,
                  purchased_credits = coalesce(purchased_credits, 0) + $2,
                  updated_at        = now()
            where organization_id = $1`,
          [input.organizationId, input.creditsToGrant],
        );
        await client.query(
          `insert into public.ai_credit_transactions
             (organization_id, transaction_type, amount, description)
           values ($1, 'purchase', $2, $3)`,
          [
            input.organizationId,
            input.creditsToGrant,
            `Plan credits — ${input.billingCycle} billing period`,
          ],
        );
      }

      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async markSubscriptionStatus(
    subscriptionId: string,
    status: string,
    cancelAtPeriodEnd?: boolean,
  ): Promise<void> {
    await this.pool.query(
      `update public.organization_subscriptions
          set status = $2,
              cancel_at_period_end = coalesce($3, cancel_at_period_end),
              updated_at = now()
        where provider_subscription_id = $1`,
      [subscriptionId, status, cancelAtPeriodEnd ?? null],
    );
  }

  /** Store the customer id at checkout so later webhooks can be attributed. */
  async linkCustomer(organizationId: string, customerId: string): Promise<void> {
    await this.pool.query(
      `update public.organization_subscriptions
          set provider_customer_id = $2, updated_at = now()
        where organization_id = $1 and provider_customer_id is null`,
      [organizationId, customerId],
    );
  }

  async recordInvoice(input: {
    organizationId: string;
    amount: number;
    currency: string;
    status: string;
    invoiceNumber: string | null;
    paidAt: string | null;
  }): Promise<void> {
    await this.pool.query(
      `insert into public.invoices
         (organization_id, invoice_number, amount, currency, status, issued_at, paid_at)
       values ($1,$2,$3,$4,$5, now(), $6::timestamptz)
       on conflict do nothing`,
      [
        input.organizationId,
        input.invoiceNumber,
        input.amount,
        input.currency,
        input.status,
        input.paidAt,
      ],
    );
  }
}
