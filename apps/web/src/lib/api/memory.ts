import { apiRequest } from "./client";

export const MEMORY_TYPES = [
  { value: "instruction", label: "Instruction", hint: "A rule the AI must always follow" },
  { value: "preference", label: "Preference", hint: "How you like things done" },
  { value: "fact", label: "Fact", hint: "Something true about you or your show" },
  { value: "context", label: "Context", hint: "Background the AI should assume" },
  { value: "insight", label: "Insight", hint: "Something you learned that should stick" },
  { value: "summary", label: "Summary", hint: "A condensed record of past work" },
] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number]["value"];

export interface Memory {
  id: string;
  project_id: string | null;
  memory_type: MemoryType;
  title: string;
  content: string;
  importance: number;
  confidence: number | null;
  source: string | null;
  access_count: number | null;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemoryStats {
  total: number;
  by_type: { memory_type: MemoryType; count: number }[];
}

export const memoryApi = {
  create: (body: {
    memory_type: MemoryType; title: string; content: string;
    project_id?: string; importance?: number;
  }) => apiRequest<Memory>("/memory", { method: "POST", body }),

  list: (
    query: { project_id?: string; memory_type?: MemoryType; search?: string } = {},
    signal?: AbortSignal,
  ) => apiRequest<{ items: Memory[]; stats: MemoryStats }>("/memory", { query: { ...query }, signal }),

  update: (id: string, body: Partial<{ memory_type: MemoryType; title: string; content: string; importance: number }>) =>
    apiRequest<Memory>(`/memory/${id}`, { method: "PATCH", body }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/memory/${id}`, { method: "DELETE" }),
};
