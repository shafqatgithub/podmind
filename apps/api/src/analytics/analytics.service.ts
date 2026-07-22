import { Injectable } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { AnalyticsRepository } from "./analytics.repository";
import type { AnalyticsWindow } from "./dto/analytics.dto";

const DEFAULT_WINDOW: AnalyticsWindow = 30;

@Injectable()
export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  /**
   * The whole dashboard in one request.
   *
   * Four small aggregates over the same window are cheaper to fetch together
   * than to have the browser issue four round trips that must then be kept
   * consistent with each other.
   */
  async overview(tenant: TenantContext, days: AnalyticsWindow = DEFAULT_WINDOW) {
    const [totals, daily, providers, tasks, failures] = await Promise.all([
      this.repository.totals(tenant, days),
      this.repository.dailyUsage(tenant, days),
      this.repository.byProvider(tenant, days),
      this.repository.byTask(tenant, days),
      this.repository.recentFailures(tenant),
    ]);

    const successRate =
      totals.requests > 0 ? Number((totals.successes / totals.requests).toFixed(4)) : null;

    return {
      window_days: days,
      totals: { ...totals, success_rate: successRate },
      daily,
      providers,
      tasks,
      recent_failures: failures,
    };
  }
}
