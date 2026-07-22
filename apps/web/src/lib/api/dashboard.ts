import { apiRequest } from "./client";

export interface DashboardOverview {
  credits: { available: number; used: number };
  recent_projects: {
    id: string;
    title: string;
    status: string;
    is_favorite: boolean;
    updated_at: string;
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
