import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export interface TopicSource {
  title?: string;
  url?: string;
  publisher?: string;
  date?: string;
}

export type Momentum = "rising" | "peaking" | "steady" | "fading";

export interface DiscoveredTopic {
  id: string;
  title: string;
  angle: string | null;
  why_now: string | null;
  audience_fit: string | null;
  momentum: Momentum | null;
  search_terms: string[] | null;
  sources: TopicSource[] | null;
  is_saved: boolean;
}

export interface DiscoveryMetadata {
  summary?: string | null;
  gaps?: string[];
  avoid?: string[];
  dropped_unsourced?: number;
}

export interface Discovery {
  id: string;
  project_id: string;
  niche: string;
  audience: string | null;
  country: string | null;
  ai_provider: string | null;
  model_name: string | null;
  metadata: DiscoveryMetadata | null;
  created_at: string;
  topics: DiscoveredTopic[];
}

export interface DiscoverySummary {
  id: string;
  niche: string;
  country: string | null;
  created_at: string;
  topic_count: number;
}

export const topicsApi = {
  status: (signal?: AbortSignal) =>
    apiRequest<{ search_available: boolean }>("/topics/status", { signal }),

  discover: (body: {
    project_id: string;
    niche: string;
    audience?: string;
    country?: string;
    provider?: SelectableProvider;
  }) => apiRequest<Discovery>("/topics/discover", { method: "POST", body }),

  list: (query: { project_id?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: DiscoverySummary[] }>("/topics", { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<Discovery>(`/topics/${id}`, { signal }),

  setSaved: (topicId: string, is_saved: boolean) =>
    apiRequest<{ id: string; is_saved: boolean }>(`/topics/saved/${topicId}`, {
      method: "PATCH",
      body: { is_saved },
    }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/topics/${id}`, { method: "DELETE" }),
};
