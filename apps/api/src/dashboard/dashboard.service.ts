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
    const [projects, research, conversations, activity, weekly, credits, stats, series, allowance] =
      await Promise.all([
        this.repository.recentProjects(tenant),
        this.repository.recentResearch(tenant),
        this.repository.recentConversations(tenant),
        this.repository.recentActivity(tenant),
        this.repository.weeklyProgress(tenant),
        this.repository.credits(tenant),
        this.repository.stats(tenant),
        this.repository.creditSeries(tenant),
        this.repository.creditAllowance(tenant),
      ]);

    /** Month-on-month change, or null when last month gives no baseline. */
    const change = (now: number, before: number): number | null =>
      before > 0 ? Math.round(((now - before) / before) * 100) : null;

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
      credits: {
        ...credits,
        // The allowance turns a raw balance into something readable as a
        // proportion; on the free tier there is no plan row, so it is null
        // and the UI shows the balance alone rather than inventing a ceiling.
        allowance: allowance.ai_credits,
        plan_name: allowance.plan_name,
        period_end: allowance.period_end,
      },
      stats: {
        projects: stats.projects,
        projects_change_pct: change(stats.projects_this_month, stats.projects_last_month),
        documents: stats.documents,
        content_created: stats.content_created,
        ai_requests: stats.ai_requests,
        credits_used_this_month: stats.credits_this_month,
        credits_change_pct: change(stats.credits_this_month, stats.credits_last_month),
      },
      credit_series: series,
      recent_projects: projects,
      recent_research: research,
      recent_conversations: conversations,
      recent_activity: activity,
      weekly: { ...weekly, research_trend_pct: trend },
    };
  }
}
