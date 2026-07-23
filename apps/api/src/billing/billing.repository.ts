import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

@Injectable()
export class BillingRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Public plans only — internal or retired plans are never exposed. */
  async listPlans() {
    const { rows } = await this.pool.query(
      `select id, name, slug::text as slug, description, monthly_price, yearly_price,
              currency, ai_credits, max_projects, max_team_members, max_storage_gb, features
         from public.subscription_plans
        where is_public = true and is_active = true
        order by monthly_price asc nulls first`,
    );
    return rows;
  }

  /**
   * Current subscription, or null when the organization has never subscribed.
   * A null here means "free tier", which the service states explicitly rather
   * than leaving the UI to infer.
   */
  async findSubscription(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select s.id, s.status, s.billing_cycle, s.current_period_start, s.current_period_end,
              s.cancel_at_period_end, s.trial_ends_at,
              p.id as plan_id, p.name as plan_name, p.slug::text as plan_slug,
              p.monthly_price, p.yearly_price, p.currency, p.ai_credits,
              p.max_projects, p.max_team_members, p.max_storage_gb, p.features
         from public.organization_subscriptions s
         join public.subscription_plans p on p.id = s.plan_id
        where s.organization_id = $1
        order by s.created_at desc
        limit 1`,
      [tenant.organizationId],
    );
    return rows[0] ?? null;
  }

  async listInvoices(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select id, invoice_number, amount, currency, status,
              invoice_url, pdf_url, issued_at, due_at, paid_at
         from public.invoices
        where organization_id = $1
        order by coalesce(issued_at, created_at) desc
        limit 50`,
      [tenant.organizationId],
    );
    return rows;
  }

  async creditBalance(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select available_credits, used_credits, purchased_credits
         from public.ai_credit_balances where organization_id = $1`,
      [tenant.organizationId],
    );
    return rows[0] ?? { available_credits: 0, used_credits: 0, purchased_credits: 0 };
  }

  /** Recent credit ledger, so a user can see where their credits went. */
  async recentTransactions(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select id, transaction_type::text as transaction_type, amount, description, created_at
         from public.ai_credit_transactions
        where organization_id = $1
        order by created_at desc
        limit 25`,
      [tenant.organizationId],
    );
    return rows;
  }
}
