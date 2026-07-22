import { apiRequest } from "./client";

export const SCRIPT_STYLES = [
  { value: "solo", label: "Solo" },
  { value: "interview", label: "Interview" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "business", label: "Business" },
  { value: "news", label: "News" },
  { value: "casual", label: "Casual" },
] as const;

export const SCRIPT_TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "humorous", label: "Humorous" },
  { value: "motivational", label: "Motivational" },
  { value: "technical", label: "Technical" },
] as const;

export type ScriptStyle = (typeof SCRIPT_STYLES)[number]["value"];
export type ScriptTone = (typeof SCRIPT_TONES)[number]["value"];

export interface ScriptSection {
  id: string;
  title: string | null;
  speaker: string | null;
  content: string;
  notes: string | null;
  duration_seconds: number | null;
  sort_order: number;
}

export interface Script {
  id: string;
  project_id: string;
  outline_id: string | null;
  title: string;
  description: string | null;
  script_style: ScriptStyle;
  content: string | null;
  word_count: number | null;
  estimated_duration_minutes: number | null;
  tone: ScriptTone;
  version: number;
  is_current: boolean;
  metadata: {
    readability?: number | null;
    editing_notes?: string[];
    verify?: string[];
    provider?: string;
    model?: string;
    unstructured?: boolean;
  } | null;
  created_at: string;
}

export interface ScriptDetail extends Script {
  sections: ScriptSection[];
}

export interface CreateScriptInput {
  project_id: string;
  topic?: string;
  outline_id?: string;
  style?: ScriptStyle;
  tone?: ScriptTone;
  duration_minutes?: number;
  guest_name?: string;
}

export const scriptsApi = {
  create: (body: CreateScriptInput) =>
    apiRequest<Script & { credits_spent: number }>("/scripts", { method: "POST", body }),

  list: (projectId?: string, signal?: AbortSignal) =>
    apiRequest<{ items: Script[] }>("/scripts", { query: { project_id: projectId }, signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<ScriptDetail>(`/scripts/${id}`, { signal }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/scripts/${id}`, { method: "DELETE" }),
};
