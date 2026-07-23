import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { TenantContext } from "../tenancy/tenancy.service";
import { BillingRepository } from "./billing.repository";

@Injectable()
export class BillingService {
  constructor(
    private readonly repository: BillingRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Whether payments can actually be taken. Checkout requires a payment
   * provider; without one the UI must say so plainly rather than showing a
   * button that leads nowhere.
   */
  private paymentsEnabled(): boolean {
    return Boolean(this.config.get<string>("STRIPE_SECRET_KEY"));
  }

  listPlans() {
    return this.repository.listPlans();
  }

  /** Everything the billing page needs in one round trip. */
  async overview(tenant: TenantContext) {
    const [plans, subscription, invoices, credits, transactions] = await Promise.all([
      this.repository.listPlans(),
      this.repository.findSubscription(tenant),
      this.repository.listInvoices(tenant),
      this.repository.creditBalance(tenant),
      this.repository.recentTransactions(tenant),
    ]);

    return {
      plans,
      subscription,
      // Stated explicitly so the UI never has to infer "free" from a null.
      is_free_tier: subscription === null,
      invoices,
      credits,
      transactions,
      payments_enabled: this.paymentsEnabled(),
    };
  }
}
