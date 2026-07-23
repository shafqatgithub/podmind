import { apiRequest } from "./client";

export interface AdminOverview {
  users: number;
  users_7d: number;
  organizations: number;
  projects: number;
  ai_requests: number;
  ai_failures: number;
  tokens: number;
  ai_cost: number;
  active_subscriptions: number;
  revenue: number;
  open_tickets: number;
}

export interface UsageDay {
  day: string;
  requests: number;
  failures: number;
  tokens: number;
  cost: number;
}

export interface TaskBreakdown {
  task: string;
  requests: number;
  failures: number;
  avg_latency_ms: number | null;
  tokens: number;
}

export interface SystemHealth {
  database: { status: string; latency_ms: number };
  ai: { requests_1h: number; failures_1h: number; failure_rate: number };
  pipelines: { running: number; stuck: number };
  checked_at: string;
}

export interface AdminError {
  id: string;
  task: string;
  error_message: string | null;
  latency_ms: number | null;
  created_at: string;
  organization_name: string | null;
}

export interface AdminDashboard {
  overview: AdminOverview;
  usage: UsageDay[];
  breakdown: TaskBreakdown[];
  health: SystemHealth;
  errors: AdminError[];
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  available_credits: number | null;
  used_credits: number | null;
  workspaces: number;
  projects: number;
  ai_requests: number;
  last_activity: string | null;
  subscription_status: string | null;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  severity: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  subject: string;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  organization_name: string | null;
  user_email: string | null;
}

export const adminApi = {
  dashboard: (signal?: AbortSignal) => apiRequest<AdminDashboard>("/admin", { signal }),

  organizations: (signal?: AbortSignal) =>
    apiRequest<{ items: AdminOrganization[] }>("/admin/organizations", { signal }),

  flags: (signal?: AbortSignal) =>
    apiRequest<{ items: FeatureFlag[] }>("/admin/flags", { signal }),

  upsertFlag: (body: {
    name: string;
    description?: string;
    enabled?: boolean;
    rollout_percentage?: number;
  }) => apiRequest<FeatureFlag>("/admin/flags", { method: "POST", body }),

  deleteFlag: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/admin/flags/${id}`, { method: "DELETE" }),

  announcements: (signal?: AbortSignal) =>
    apiRequest<{ items: Announcement[] }>("/admin/announcements", { signal }),

  createAnnouncement: (body: {
    title: string;
    message: string;
    severity?: string;
    ends_at?: string;
  }) => apiRequest<Announcement>("/admin/announcements", { method: "POST", body }),

  setAnnouncementActive: (id: string, is_active: boolean) =>
    apiRequest<Announcement>(`/admin/announcements/${id}`, {
      method: "PATCH",
      body: { is_active },
    }),

  tickets: (status?: string, signal?: AbortSignal) =>
    apiRequest<{ items: SupportTicket[] }>("/admin/tickets", {
      query: status ? { status } : {},
      signal,
    }),

  updateTicket: (id: string, status: string) =>
    apiRequest<SupportTicket>(`/admin/tickets/${id}`, { method: "PATCH", body: { status } }),
};
