import { apiRequest } from "./client";

export interface DashboardStats {
  projects: number;
  projects_change_pct: number | null;
  documents: number;
  content_created: number;
  ai_requests: number;
  credits_used_this_month: number;
  credits_change_pct: number | null;
}

export interface CreditDay {
  day: string;
  credits: number;
}

export interface DashboardOverview {
  stats: DashboardStats;
  credit_series: CreditDay[];
  credits: {
    available: number;
    used: number;
    /** The plan's allowance, or null on the free tier where no plan row exists. */
    allowance: number | null;
    plan_name: string | null;
    period_end: string | null;
  };
  recent_projects: {
    id: string;
    title: string;
    status: string;
    is_favorite: boolean;
    updated_at: string;
    document_count: number;
  }[];
  recent_research: {
    id: string;
    title: string;
    depth: string;
    project_title: string | null;
    confidence_score: number | null;
    created_at: string;
  }[];
  recent_conversations: {
    id: string;
    title: string;
    total_messages: number;
    updated_at: string;
  }[];
  recent_activity: { action: string; resource_type: string; created_at: string }[];
  weekly: {
    research_this_week: number;
    research_last_week: number;
    messages_this_week: number;
    documents_this_week: number;
    research_trend_pct: number | null;
  };
}

export const dashboardApi = {
  overview: (signal?: AbortSignal) => apiRequest<DashboardOverview>("/dashboard", { signal }),
};
