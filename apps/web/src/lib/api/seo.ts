import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export interface SeoTitle { id: string; title: string; seo_score: number | null; click_score: number | null; selected: boolean }
export interface SeoDescription { id: string; description: string; seo_score: number | null; selected: boolean }
export interface SeoKeyword { id: string; keyword: string; intent: string | null; priority: number | null }
export interface SeoTag { id: string; tag: string; selected: boolean }
export interface SeoHashtag { id: string; hashtag: string }
export interface SeoChapter { id: string; title: string; timestamp_seconds: number }

export interface SeoMetadata {
  provider?: string;
  model?: string;
  thumbnail_ideas?: string[];
  ctr_suggestions?: string[];
}

export interface SeoSet {
  id: string;
  project_id: string;
  script_id: string | null;
  title: string;
  target_keyword: string | null;
  search_intent: string | null;
  score: number | null;
  metadata: SeoMetadata | null;
  created_at: string;
}

export interface SeoSetDetail extends SeoSet {
  titles: SeoTitle[];
  descriptions: SeoDescription[];
  keywords: SeoKeyword[];
  tags: SeoTag[];
  hashtags: SeoHashtag[];
  chapters: SeoChapter[];
}

export const seoApi = {
  create: (body: {
    project_id: string; script_id?: string; topic?: string;
    target_keyword?: string; provider?: SelectableProvider;
  }) => apiRequest<SeoSetDetail>("/seo", { method: "POST", body }),

  list: (query: { project_id?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: SeoSet[] }>("/seo", { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<SeoSetDetail>(`/seo/${id}`, { signal }),

  select: (id: string, body: { title_id?: string; description_id?: string }) =>
    apiRequest<SeoSetDetail>(`/seo/${id}/selection`, { method: "PATCH", body }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/seo/${id}`, { method: "DELETE" }),
};
