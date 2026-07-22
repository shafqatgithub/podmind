import { Injectable } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { DashboardRepository } from "./dashboard.repository";

@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  /**
   * The whole dashboard in one request.
   *
   * Widgets are independent, so they are fetched together and a single slow
   * query cannot stall the others behind it.
   */
  async overview(tenant: TenantContext) {
    const [projects, research, conversations, activity, weekly, credits] = await Promise.all([
      this.repository.recentProjects(tenant),
      this.repository.recentResearch(tenant),
      this.repository.recentConversations(tenant),
      this.repository.recentActivity(tenant),
      this.repository.weeklyProgress(tenant),
      this.repository.credits(tenant),
    ]);

    // A percentage against last week, or null when there is no baseline —
    // "+100%" from zero would be noise dressed as insight.
    const trend =
      weekly.research_last_week > 0
        ? Math.round(
            ((weekly.research_this_week - weekly.research_last_week) /
              weekly.research_last_week) *
              100,
          )
        : null;

    return {
      credits,
      recent_projects: projects,
      recent_research: research,
      recent_conversations: conversations,
      recent_activity: activity,
      weekly: { ...weekly, research_trend_pct: trend },
    };
  }
}
