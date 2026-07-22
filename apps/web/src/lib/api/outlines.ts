import { apiRequest } from "./client";

export const OUTLINE_STYLES = [
  { value: "solo", label: "Solo", hint: "One host, structure carries the episode" },
  { value: "interview", label: "Interview", hint: "Built around a guest's expertise" },
  { value: "educational", label: "Educational", hint: "Teach one idea properly" },
  { value: "storytelling", label: "Storytelling", hint: "Setup, tension, turn, resolution" },
  { value: "business", label: "Business", hint: "Frameworks and actionable takeaways" },
  { value: "news", label: "News", hint: "What happened, why it matters, what's next" },
  { value: "casual", label: "Casual", hint: "Prompts rather than a rigid script" },
] as const;

export type OutlineStyle = (typeof OUTLINE_STYLES)[number]["value"];

export interface OutlineSection {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  estimated_minutes: number | null;
  talking_points: string[] | null;
  notes: string | null;
  metadata: { transition?: string | null } | null;
}

export interface Outline {
  id: string;
  project_id: string;
  research_session_id: string | null;
  title: string;
  description: string | null;
  outline_type: OutlineStyle;
  status: string;
  estimated_duration_minutes: number | null;
  version: number;
  is_current: boolean;
  metadata: {
    hook?: string | null;
    call_to_action?: string | null;
    closing?: string | null;
    model?: string;
    provider?: string;
    unstructured?: boolean;
  } | null;
  created_at: string;
}

export interface OutlineDetail extends Outline {
  sections: OutlineSection[];
  questions: { id: string; question: string }[];
}

export interface CreateOutlineInput {
  project_id: string;
  topic: string;
  style?: OutlineStyle;
  duration_minutes?: number;
  research_session_id?: string;
  guest_name?: string;
  provider?: "openai" | "anthropic" | "google";
}

export const outlinesApi = {
  create: (body: CreateOutlineInput) =>
    apiRequest<{ id: string; provider: string; model: string; credits_spent: number }>(
      "/outlines",
      { method: "POST", body },
    ),

  list: (projectId?: string, signal?: AbortSignal) =>
    apiRequest<{ items: Outline[] }>("/outlines", {
      query: { project_id: projectId },
      signal,
    }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<OutlineDetail>(`/outlines/${id}`, { signal }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/outlines/${id}`, { method: "DELETE" }),
};
