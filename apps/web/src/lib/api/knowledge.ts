import { apiRequest } from "./client";

export interface KnowledgeDocument {
  id: string;
  title: string;
  source_type: string | null;
  source_url: string | null;
  status: string;
  chunk_count?: number;
  created_at: string;
}

export interface KnowledgeHit {
  chunk_id: string;
  document_id: string;
  document_title: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
}

export interface KnowledgeStatus {
  available: boolean;
  providers: string[];
  ingest_credits: number;
  search_credits: number;
}

export const knowledgeApi = {
  status: (signal?: AbortSignal) => apiRequest<KnowledgeStatus>("/knowledge/status", { signal }),

  list: (projectId: string, signal?: AbortSignal) =>
    apiRequest<{ items: KnowledgeDocument[] }>("/knowledge/documents", {
      query: { project_id: projectId },
      signal,
    }),

  create: (body: { project_id: string; title: string; content: string; source_url?: string }) =>
    apiRequest<KnowledgeDocument>("/knowledge/documents", { method: "POST", body }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/knowledge/documents/${id}`, { method: "DELETE" }),

  search: (body: { project_id: string; query: string; limit?: number }) =>
    apiRequest<{ items: KnowledgeHit[]; query: string }>("/knowledge/search", {
      method: "POST",
      body,
    }),
};
