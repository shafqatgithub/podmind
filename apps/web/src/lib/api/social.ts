import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export const SOCIAL_PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", limit: 3000 },
  { value: "x", label: "X", limit: 280 },
  { value: "instagram", label: "Instagram", limit: 2200 },
  { value: "facebook", label: "Facebook", limit: 2000 },
  { value: "threads", label: "Threads", limit: 500 },
  { value: "youtube", label: "YouTube", limit: 5000 },
  { value: "newsletter", label: "Newsletter", limit: 4000 },
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["value"];

export const TONES = [
  "professional", "friendly", "formal", "casual", "humorous", "motivational", "technical",
] as const;
export type Tone = (typeof TONES)[number];

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  title: string | null;
  content: string;
  character_count: number | null;
  word_count: number | null;
  status: string;
  hashtags: string[];
}

export interface SocialCampaignMeta {
  provider?: string;
  model?: string;
  tone?: string;
  thread?: string[];
  carousel_ideas?: string[];
  emoji_notes?: string[];
}

export interface SocialCampaign {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  metadata: SocialCampaignMeta | null;
  created_at: string;
  post_count?: number;
}

export interface SocialCampaignDetail extends SocialCampaign {
  posts: SocialPost[];
}

export const socialApi = {
  create: (body: {
    project_id: string; script_id?: string; topic?: string;
    platforms: SocialPlatform[]; tone?: Tone; provider?: SelectableProvider;
  }) => apiRequest<SocialCampaignDetail>("/social", { method: "POST", body }),

  list: (query: { project_id?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: SocialCampaign[] }>("/social", { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<SocialCampaignDetail>(`/social/${id}`, { signal }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/social/${id}`, { method: "DELETE" }),
};
