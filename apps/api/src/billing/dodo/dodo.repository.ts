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
export class DodoRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /**
   * Claim an event id. Returns false if it was already processed.
   *
   * Prefixed so a Dodo event id can never collide with a leftover Paddle one
   * in the same shared events table.
   */
  async claimEvent(eventId: string, eventType: string, payload: unknown): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      `insert into public.payment_webhook_events (event_id, event_type, payload)
       values ($1,$2,$3)
       on conflict (event_id) do nothing`,
      [`dodo:${eventId}`, eventType, JSON.stringify(payload)],
    );
    return rowCount === 1;
  }

  async releaseEvent(eventId: string): Promise<void> {
    await this.pool.query(`delete from public.payment_webhook_events where event_id = $1`, [
      `dodo:${eventId}`,
    ]);
  }

  /** Which plan and cycle does this Dodo product correspond to? */
  async planForProduct(productId: string): Promise<PlanMatch | null> {
    const { rows } = await this.pool.query<PlanMatch>(
      `select id as plan_id, slug, name, ai_credits,
              case when dodo_product_id_yearly = $1 then 'yearly' else 'monthly' end
                as billing_cycle
         from public.subscription_plans
        where dodo_product_id_monthly = $1 or dodo_product_id_yearly = $1
        limit 1`,
      [productId],
    );
    return rows[0] ?? null;
  }

  /** Resolve the organization a Dodo customer belongs to. */
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
   * or vice versa. Mirrors PaddleRepository.applySubscription exactly —
   * both write to the same provider-agnostic tables.
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

  /** Plan + product ids needed to start a checkout session. */
  async planForCheckout(
    planSlug: string,
    cycle: "monthly" | "yearly",
  ): Promise<{ plan_id: string; product_id: string | null } | null> {
    const column = cycle === "yearly" ? "dodo_product_id_yearly" : "dodo_product_id_monthly";
    const { rows } = await this.pool.query(
      `select id as plan_id, ${column} as product_id
         from public.subscription_plans
        where slug = $1::public.subscription_plan and is_active = true
        limit 1`,
      [planSlug],
    );
    return rows[0] ?? null;
  }
}
