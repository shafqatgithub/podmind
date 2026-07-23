import { apiRequest } from "./client";
import { createClient } from "@/lib/supabase/client";

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
  /**
   * Streaming send.
   *
   * The SSE endpoint writes the response directly, bypassing the envelope, so
   * this reads the body itself rather than going through apiRequest.
   */
  stream: async (
    id: string,
    body: { content: string; provider?: "openai" | "anthropic" | "google" },
    handlers: {
      onDelta: (text: string) => void;
      onDone: (result: { assistant_message_id: string; model: string }) => void;
      onError: (message: string) => void;
    },
    signal?: AbortSignal,
  ): Promise<void> => {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) {
      handlers.onError("The PodMind API is not configured.");
      return;
    }

    const supabase = createClient();
    const token = supabase
      ? (await supabase.auth.getSession()).data.session?.access_token
      : undefined;

    let response: Response;
    try {
      response = await fetch(`${base}/api/v1/chat/conversations/${id}/messages/stream`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch {
      handlers.onError("Could not reach the PodMind API.");
      return;
    }

    if (!response.ok || !response.body) {
      handlers.onError("The assistant could not reply.");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line; a partial event waits for the
      // rest of itself rather than being parsed half-formed.
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const event = JSON.parse(line.slice(5).trim()) as {
              type: string;
              text?: string;
              message?: string;
              assistant_message_id?: string;
              model?: string;
            };
            if (event.type === "delta" && event.text) handlers.onDelta(event.text);
            else if (event.type === "done")
              handlers.onDone({
                assistant_message_id: event.assistant_message_id ?? "",
                model: event.model ?? "",
              });
            else if (event.type === "error")
              handlers.onError(event.message ?? "The assistant could not reply.");
          } catch {
            // A malformed frame is skipped rather than ending the stream.
          }
        }
      }
    }
  },

};
