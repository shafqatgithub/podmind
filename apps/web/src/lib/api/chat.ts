import { apiRequest } from "./client";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  ai_provider: string | null;
  model_name: string | null;
  total_tokens: number | null;
  response_time_ms: number | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  project_id: string | null;
  title: string;
  ai_provider: string | null;
  model_name: string | null;
  total_messages: number;
  total_tokens: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface SendMessageResult {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  credits_spent: number;
  provider: string;
  model: string;
}

export const chatApi = {
  list: (
    query: { project_id?: string; search?: string; include_archived?: boolean; limit?: number } = {},
    signal?: AbortSignal,
  ) =>
    apiRequest<{ items: Conversation[]; next_cursor: string | null; has_more: boolean }>(
      "/chat/conversations",
      { query: { ...query }, signal },
    ),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<ConversationDetail>(`/chat/conversations/${id}`, { signal }),

  create: (body: { project_id?: string; title?: string }) =>
    apiRequest<Conversation>("/chat/conversations", { method: "POST", body }),

  update: (id: string, body: { title?: string; is_pinned?: boolean; is_archived?: boolean }) =>
    apiRequest<Conversation>(`/chat/conversations/${id}`, { method: "PATCH", body }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/chat/conversations/${id}`, { method: "DELETE" }),

  send: (id: string, body: { content: string; provider?: "openai" | "anthropic" | "google" }) =>
    apiRequest<SendMessageResult>(`/chat/conversations/${id}/messages`, {
      method: "POST",
      body,
    }),
};
