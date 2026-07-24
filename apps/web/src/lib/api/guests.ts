import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export interface GuestCompany {
  id: string;
  company_name: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}

export interface GuestBook {
  id: string;
  title: string;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
}

export interface GuestInterview {
  id: string;
  platform: string | null;
  interview_title: string | null;
  interview_url: string | null;
  interview_date: string | null;
  summary: string | null;
}

export interface GuestSocial {
  id: string;
  platform: string;
  username: string | null;
  profile_url: string | null;
  followers: number | null;
  verified: boolean | null;
}

export interface GuestQuestion {
  id: string;
  question: string;
  question_type: string;
  difficulty: string | null;
  ai_generated: boolean;
}

export interface GuestNote {
  id: string;
  note: string;
  created_at: string;
}

export interface GuestMetadata {
  provider?: string;
  model?: string;
  unstructured?: boolean;
  confidence_score?: number | null;
  career_timeline?: { date?: string; event?: string }[];
  awards?: string[];
  interesting_facts?: string[];
  controversies?: string[];
  conversation_opportunities?: string[];
  uncertainties?: string[];
  sources?: { title?: string; url?: string }[];
}

export interface Guest {
  id: string;
  project_id: string;
  full_name: string;
  slug: string | null;
  headline: string | null;
  biography: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  country: string | null;
  website_url: string | null;
  email: string | null;
  image_url: string | null;
  metadata: GuestMetadata | null;
  created_at: string;
  updated_at: string;
}

export interface GuestDetail extends Guest {
  companies: GuestCompany[];
  books: GuestBook[];
  interviews: GuestInterview[];
  social_profiles: GuestSocial[];
  questions: GuestQuestion[];
  tags: string[];
  notes: GuestNote[];
}

/** Question buckets in the order a host would actually use them. */
export const QUESTION_GROUPS = [
  { type: "ice_breaker", label: "Ice breakers" },
  { type: "smart", label: "Smart questions" },
  { type: "difficult", label: "Difficult questions" },
  { type: "fun", label: "Fun questions" },
  { type: "closing", label: "Closing questions" },
] as const;

export interface GuestSuggestion {
  id: string;
  project_id: string;
  topic: string;
  country: string | null;
  full_name: string;
  headline: string | null;
  why_them: string | null;
  expertise: string | null;
  reachability: "easy" | "moderate" | "hard" | null;
  profile_urls: { platform?: string; url?: string }[] | null;
  sources: { title?: string; url?: string; publisher?: string }[] | null;
  confidence: number | null;
  guest_id: string | null;
  created_at: string;
}

export interface GuestDiscovery {
  topic: string;
  summary: string | null;
  angles: string[];
  notes: string[];
  dropped_unsourced: number;
  items: GuestSuggestion[];
}

export const guestsApi = {
  discoveryStatus: (signal?: AbortSignal) =>
    apiRequest<{ search_available: boolean }>("/guests/discovery-status", { signal }),

  discover: (body: {
    project_id: string;
    topic: string;
    country?: string;
    provider?: SelectableProvider;
  }) => apiRequest<GuestDiscovery>("/guests/discover", { method: "POST", body }),

  suggestions: (query: { project_id?: string; topic?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: GuestSuggestion[] }>("/guests/suggestions", {
      query: { ...query },
      signal,
    }),

  /** Turns a lead into a full briefing. Consumes credits. */
  promote: (id: string, provider?: SelectableProvider) =>
    apiRequest<GuestDetail>(`/guests/suggestions/${id}/promote`, {
      method: "POST",
      body: provider ? { provider } : {},
    }),

  research: (body: {
    project_id: string;
    full_name: string;
    context?: string;
    provider?: SelectableProvider;
  }) => apiRequest<GuestDetail>("/guests", { method: "POST", body }),

  createManual: (body: {
    project_id: string;
    full_name: string;
    headline?: string;
    company?: string;
    job_title?: string;
    email?: string;
    website_url?: string;
  }) => apiRequest<GuestDetail>("/guests/manual", { method: "POST", body }),

  list: (query: { project_id?: string; search?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: Guest[] }>("/guests", { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<GuestDetail>(`/guests/${id}`, { signal }),

  addNote: (id: string, note: string) =>
    apiRequest<GuestNote>(`/guests/${id}/notes`, { method: "POST", body: { note } }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/guests/${id}`, { method: "DELETE" }),
};
