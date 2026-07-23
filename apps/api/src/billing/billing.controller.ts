import { Controller, Get } from "@nestjs/common";
import { CurrentUser, Public, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { BillingService } from "./billing.service";

/** Billing — /api/v1/billing */
@Controller("billing")
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Public: the pricing page needs plans before anyone signs in. */
  @Public()
  @Get("plans")
  listPlans() {
    return this.billing.listPlans();
  }

  @Get()
  async overview(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.billing.overview(tenant);
  }
}
