import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import DodoPayments from "dodopayments";
import { DodoRepository } from "./dodo.repository";

@Injectable()
export class DodoService {
  private readonly logger = new Logger(DodoService.name);
  private client: DodoPayments | null = null;

  constructor(
    private readonly repository: DodoRepository,
    private readonly config: ConfigService,
  ) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>("DODO_PAYMENTS_API_KEY") &&
        this.config.get<string>("DODO_PAYMENTS_WEBHOOK_SECRET"),
    );
  }

  private getClient(): DodoPayments {
    if (this.client) return this.client;
    const bearerToken = this.config.get<string>("DODO_PAYMENTS_API_KEY");
    if (!bearerToken) {
      throw new Error("DODO_PAYMENTS_API_KEY is not configured");
    }
    const environment =
      this.config.get<string>("DODO_PAYMENTS_ENVIRONMENT") === "live_mode"
        ? "live_mode"
        : "test_mode";
    this.client = new DodoPayments({ bearerToken, environment });
    return this.client;
  }

  /**
   * Creates a hosted checkout session for a plan and returns the URL to send
   * the browser to. The organization id travels in metadata so the webhook
   * — which is the only thing that actually grants the plan — can attribute
   * the purchase; on a first purchase there is no earlier customer record to
   * match against.
   */
  async createCheckoutSession(input: {
    planSlug: string;
    billingCycle: "monthly" | "yearly";
    organizationId: string;
    email: string | null;
    returnUrl: string;
  }): Promise<{ checkoutUrl: string }> {
    const plan = await this.repository.planForCheckout(input.planSlug, input.billingCycle);
    if (!plan?.product_id) {
      throw new Error(
        `Plan "${input.planSlug}" (${input.billingCycle}) is not mapped to a Dodo product yet`,
      );
    }

    const client = this.getClient();
    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: plan.product_id, quantity: 1 }],
      ...(input.email ? { customer: { email: input.email } } : {}),
      return_url: input.returnUrl,
      metadata: { organization_id: input.organizationId },
    });

    this.logger.log({ organization: input.organizationId, plan: input.planSlug }, "checkout session created");
    if (!session.checkout_url) {
      throw new Error("Dodo did not return a checkout URL");
    }
    return { checkoutUrl: session.checkout_url };
  }
}
