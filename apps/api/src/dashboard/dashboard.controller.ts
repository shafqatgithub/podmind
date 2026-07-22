import { Controller, Get } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { DashboardService } from "./dashboard.service";

/** Dashboard API — /api/v1/dashboard */
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async overview(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.dashboard.overview(tenant);
  }
}
