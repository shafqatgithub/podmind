import { apiRequest } from "./client";

export const RESEARCH_DEPTHS = [
  { value: "quick", label: "Quick", hint: "Essentials for a 10-minute conversation" },
  { value: "standard", label: "Standard", hint: "A well-rounded briefing for a full episode" },
  { value: "deep", label: "Deep", hint: "Exhaustive: history, nuance, strongest objections" },
] as const;

export type ResearchDepth = (typeof RESEARCH_DEPTHS)[number]["value"];

export interface ResearchSource {
  id: string;
  title: string | null;
  url: string | null;
  author: string | null;
  source_type: string | null;
  credibility_score: number | null;
}

export interface ResearchStatistic {
  value?: string;
  claim?: string;
  source?: string;
  year?: string;
  confidence?: string;
}

export interface ResearchPair {
  [key: string]: unknown;
}

export interface ResearchMetadata {
  model?: string;
  provider?: string;
  depth?: string;
  unstructured?: boolean;
  key_points?: string[];
  statistics?: ResearchStatistic[];
  timeline?: { date?: string; event?: string }[];
  case_studies?: { name?: string; detail?: string }[];
  expert_opinions?: { expert?: string; position?: string }[];
  myths?: { myth?: string; reality?: string }[];
  arguments?: string[];
  counter_arguments?: string[];
  discussion_ideas?: string[];
  related_topics?: string[];
  uncertainties?: string[];
}

export interface ResearchResult {
  id: string;
  title: string | null;
  summary: string | null;
  content: string | null;
  confidence_score: number | null;
  token_usage: number | null;
  processing_time_ms: number | null;
  metadata: ResearchMetadata | null;
  created_at: string;
  sources: ResearchSource[];
}

export interface ResearchQuestion {
  id: string;
  question: string;
  answer: string | null;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  project_id: string;
  title: string;
  topic: string;
  objective: string | null;
  depth: ResearchDepth;
  status: string;
  ai_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchSessionDetail extends ResearchSession {
  results: ResearchResult[];
  questions: ResearchQuestion[];
}

export interface CreateResearchInput {
  project_id: string;
  topic: string;
  title?: string;
  objective?: string;
  depth?: ResearchDepth;
}

export interface ResearchRunResponse extends ResearchSession {
  provider: string;
  model: string;
  credits_spent: number;
  latency_ms: number;
}

export const researchApi = {
  /** Long-running: the AI call can take up to a couple of minutes. */
  create: (body: CreateResearchInput) =>
    apiRequest<ResearchRunResponse>("/research", { method: "POST", body }),

  list: (query: { project_id?: string; search?: string; limit?: number } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: ResearchSession[]; next_cursor: string | null; has_more: boolean }>(
      "/research",
      { query: { ...query }, signal },
    ),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<ResearchSessionDetail>(`/research/${id}`, { signal }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/research/${id}`, { method: "DELETE" }),
};
