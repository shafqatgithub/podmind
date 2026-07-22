import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { AnalyticsService } from "./analytics.service";
import { AnalyticsQueryDto } from "./dto/analytics.dto";

/** Analytics API — /api/v1/analytics */
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get("overview")
  async overview(@CurrentUser() user: AuthUser, @Query() query: AnalyticsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.analytics.overview(tenant, query.days);
  }
}
