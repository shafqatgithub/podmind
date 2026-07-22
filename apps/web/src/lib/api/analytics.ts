import { apiRequest } from "./client";

export interface AnalyticsTotals {
  requests: number;
  successes: number;
  failures: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
  success_rate: number | null;
  credits_available: number;
  credits_used: number;
  projects: number;
  research_sessions: number;
  conversations: number;
  knowledge_documents: number;
}

export interface UsagePoint {
  day: string;
  requests: number;
  tokens: number;
  credits: number;
  cost: number;
}

export interface ProviderUsage {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  tokens: number;
  cost: number;
  avg_latency_ms: number;
}

export interface TaskUsage {
  task: string;
  requests: number;
  tokens: number;
  cost: number;
}

export interface AnalyticsFailure {
  created_at: string;
  provider: string | null;
  task: string;
  error_message: string | null;
}

export interface AnalyticsOverview {
  window_days: number;
  totals: AnalyticsTotals;
  daily: UsagePoint[];
  providers: ProviderUsage[];
  tasks: TaskUsage[];
  recent_failures: AnalyticsFailure[];
}

export const ANALYTICS_WINDOWS = [7, 30, 90] as const;

export const analyticsApi = {
  overview: (days: number, signal?: AbortSignal) =>
    apiRequest<AnalyticsOverview>("/analytics/overview", { query: { days }, signal }),
};
