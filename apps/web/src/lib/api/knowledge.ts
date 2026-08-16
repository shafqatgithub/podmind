import { createClient } from "@/lib/supabase/client";
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

  /**
   * Upload a file.
   *
   * Goes through fetch rather than the shared client because that one sends
   * JSON, and a multipart body must not carry a JSON content-type header —
   * the browser has to set the boundary itself.
   */
  upload: async (input: { projectId: string; file: File; title?: string }) => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) throw new Error("The PodMind API URL is not configured yet.");

    const supabase = createClient();
    const {
      data: { session },
    } = (await supabase?.auth.getSession()) ?? { data: { session: null } };

    const form = new FormData();
    form.append("file", input.file);
    form.append("project_id", input.projectId);
    if (input.title) form.append("title", input.title);

    const response = await fetch(`${base}/api/v1/knowledge/documents/upload`, {
      method: "POST",
      headers: session?.access_token
        ? { authorization: `Bearer ${session.access_token}` }
        : {},
      body: form,
    });

    const envelope = (await response.json().catch(() => null)) as {
      success?: boolean;
      data?: KnowledgeDocument;
      error?: { message?: string };
    } | null;

    if (!response.ok || !envelope?.success) {
      throw new Error(
        envelope?.error?.message ??
          (response.status === 413
            ? "That file is too large."
            : `The upload failed (${response.status}).`),
      );
    }
    return envelope.data as KnowledgeDocument;
  },

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/knowledge/documents/${id}`, { method: "DELETE" }),

  search: (body: { project_id: string; query: string; limit?: number }) =>
    apiRequest<{ items: KnowledgeHit[]; query: string }>("/knowledge/search", {
      method: "POST",
      body,
    }),
};
