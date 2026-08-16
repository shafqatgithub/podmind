import { apiRequest } from "./client";

export const CALENDAR_STATUSES = [
  "planned",
  "researching",
  "recording",
  "editing",
  "published",
] as const;
export type CalendarStatus = (typeof CALENDAR_STATUSES)[number];

export interface CalendarEntry {
  id: string;
  project_id: string;
  title: string;
  topic: string | null;
  notes: string | null;
  scheduled_for: string;
  publish_at: string | null;
  guest_id: string | null;
  guest_name: string | null;
  agent_session_id: string | null;
  agent_status: string | null;
  status: CalendarStatus;
}

/** One episode in an AI proposal — not saved until the host approves. */
export interface SuggestedEpisode {
  title: string;
  topic: string | null;
  angle: string | null;
  format: string | null;
  effort: string | null;
  guest_suggestion: string | null;
  notes: string | null;
  scheduled_for: string;
}

export interface ScheduleProposal {
  episodes: SuggestedEpisode[];
  arc: string | null;
  cautions: string[];
  cadence: "weekly" | "biweekly" | "monthly";
  start_date: string;
  credits_spent: number;
}

export const calendarApi = {
  list: (query: { project_id?: string; from?: string; to?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: CalendarEntry[]; from: string; to: string }>("/calendar", {
      query: { ...query },
      signal,
    }),

  create: (body: {
    project_id: string;
    title: string;
    topic?: string;
    notes?: string;
    scheduled_for: string;
    publish_at?: string;
    guest_id?: string;
    /** Sets how far ahead reminders go out. */
    cadence?: "daily" | "weekly" | "biweekly" | "monthly";
  }) => apiRequest<CalendarEntry>("/calendar", { method: "POST", body }),

  /** Lay several episodes across a cadence in one go. */
  plan: (body: {
    project_id: string;
    start_date: string;
    cadence: "weekly" | "biweekly" | "monthly";
    items: { title: string; topic?: string; notes?: string }[];
    publish_offset_days?: number;
  }) => apiRequest<{ created: number; from: string; to: string }>("/calendar/plan", {
    method: "POST",
    body,
  }),

  /** Ask the AI to propose a run. Nothing is saved until plan() is called. */
  suggest: (body: {
    project_id: string;
    count?: number;
    cadence?: "weekly" | "biweekly" | "monthly";
    start_date?: string;
    theme?: string;
    language?: string;
  }) => apiRequest<ScheduleProposal>("/calendar/suggest", { method: "POST", body }),

  update: (
    id: string,
    body: Partial<{
      title: string;
      topic: string;
      notes: string;
      scheduled_for: string;
      publish_at: string;
      guest_id: string;
      status: CalendarStatus;
    }>,
  ) => apiRequest<CalendarEntry>(`/calendar/${id}`, { method: "PATCH", body }),

  run: (id: string) => apiRequest<CalendarEntry>(`/calendar/${id}/run`, { method: "POST" }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/calendar/${id}`, { method: "DELETE" }),
};
