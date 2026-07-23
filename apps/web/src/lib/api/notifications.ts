import { apiRequest } from "./client";

export const NOTIFICATION_TYPES = [
  "system", "project", "research", "billing", "security", "announcement", "marketing",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  marketing_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  timezone: string | null;
}

export const notificationsApi = {
  list: (query: { unread_only?: boolean; type?: NotificationType; limit?: number } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: Notification[]; unread_count: number }>("/notifications", {
      query: { ...query },
      signal,
    }),

  markRead: (id: string) =>
    apiRequest<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),

  markAllRead: () => apiRequest<{ marked: number }>("/notifications/read-all", { method: "POST" }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/notifications/${id}`, { method: "DELETE" }),

  getPreferences: (signal?: AbortSignal) =>
    apiRequest<NotificationPreferences>("/notifications/preferences", { signal }),

  updatePreferences: (body: Partial<NotificationPreferences>) =>
    apiRequest<NotificationPreferences>("/notifications/preferences", { method: "PATCH", body }),
};
