"use client";

/**
 * AI Chat workspace — 13-Information-Architecture §14: chat history, new
 * chat, pinned chats.
 *
 * The user's message is shown immediately and the assistant's reply streams
 * in as one block when it arrives. If the request fails, the optimistic turn
 * is removed rather than left stranded — the server does the same, so the
 * thread the user sees always matches what was stored.
 */

import * as React from "react";
import {
  Bot,
  MessageSquare,
  Pin,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Select, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { chatApi, type ChatMessage, type Conversation, type ConversationDetail } from "@/lib/api/chat";
import { EmptyState } from "@/components/common/empty-state";

/* ---------------------------------------------------------- markdown */

/**
 * Minimal Markdown rendering for assistant replies.
 *
 * The model is asked for Markdown, and headings, lists, bold and inline code
 * cover essentially everything it produces in chat. Text is escaped first, so
 * model output can never inject markup.
 */
function renderMarkdown(source: string): string {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const lines = escaped.split("\n");
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const inline = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, '<code class="rounded bg-surface px-1 py-0.5 text-xs">$1</code>');

    const heading = /^(#{1,4})\s+(.*)$/.exec(inline);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(inline);
    const numbered = /^\s*\d+\.\s+(.*)$/.exec(inline);

    if (heading) {
      closeList();
      html.push(`<p class="mt-3 font-display font-semibold">${heading[2]}</p>`);
    } else if (bullet || numbered) {
      if (!inList) {
        html.push('<ul class="my-2 flex list-disc flex-col gap-1 pl-5">');
        inList = true;
      }
      html.push(`<li>${(bullet ?? numbered)![1]}</li>`);
    } else if (inline.trim() === "") {
      closeList();
    } else {
      closeList();
      html.push(`<p class="my-2">${inline}</p>`);
    }
  }
  closeList();
  return html.join("");
}

/* ----------------------------------------------------------- bubbles */

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        aria-hidden
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary-500/20 text-primary-300" : "bg-purple-500/20 text-purple-300",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("min-w-0 max-w-[85%]", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-lg px-4 py-2.5 text-left text-sm",
            isUser
              ? "bg-primary-500/15 text-foreground"
              : "border border-primary-500/20 bg-card/80",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )}
        </div>
        {!isUser && message.model_name ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {message.model_name}
            {message.response_time_ms ? ` · ${(message.response_time_ms / 1000).toFixed(1)}s` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300"
      >
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-lg border border-primary-500/20 bg-card/80 px-4 py-3">
        <span className="flex gap-1" aria-label="Thinking">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- page */

export function ChatWorkspace() {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [active, setActive] = React.useState<ConversationDetail | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectId, setProjectId] = React.useState("");
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [streamingText, setStreamingText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const threadEndRef = React.useRef<HTMLDivElement>(null);

  const loadConversations = React.useCallback(async (signal?: AbortSignal) => {
    const page = await chatApi.list({ limit: 40 }, signal);
    setConversations(page.items);
    return page.items;
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [items, projectPage] = await Promise.all([
          loadConversations(controller.signal),
          projectsApi.list({ limit: 100 }, controller.signal),
        ]);
        setProjects(projectPage.items.filter((p) => !p.is_archived));
        const latest = items[0];
        if (latest) setActive(await chatApi.get(latest.id, controller.signal));
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadConversations]);

  React.useEffect(() => {
    // streamingText is a dependency because the message count does not change
    // while an answer streams — without it the reply grows below the fold and
    // the reader has to chase it. Instant while streaming, since a smooth
    // scroll restarted on every token fights itself.
    threadEndRef.current?.scrollIntoView({
      behavior: streamingText ? "auto" : "smooth",
      block: "end",
    });
  }, [active?.messages.length, sending, streamingText]);

  const startConversation = async () => {
    setError(null);
    try {
      const conversation = await chatApi.create(projectId ? { project_id: projectId } : {});
      setConversations((all) => [conversation, ...all]);
      setActive({ ...conversation, messages: [] });
    } catch {
      setError("Could not start a new conversation.");
    }
  };

  const open = async (id: string) => {
    setError(null);
    try {
      setActive(await chatApi.get(id));
    } catch {
      setError("Could not open that conversation.");
    }
  };

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    let conversation = active;
    // First message with no conversation open: create one silently.
    if (!conversation) {
      try {
        const created = await chatApi.create(projectId ? { project_id: projectId } : {});
        conversation = { ...created, messages: [] };
        setConversations((all) => [created, ...all]);
        setActive(conversation);
      } catch {
        setError("Could not start a new conversation.");
        return;
      }
    }

    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      conversation_id: conversation.id,
      role: "user",
      content,
      ai_provider: null,
      model_name: null,
      total_tokens: null,
      response_time_ms: null,
      created_at: new Date().toISOString(),
    };

    setInput("");
    setError(null);
    setSending(true);
    setActive({ ...conversation, messages: [...conversation.messages, optimistic] });

    // A placeholder the deltas are appended to, so the answer appears as it
    // is written rather than after the whole thing has arrived.
    const streamingId = `streaming-${Date.now()}`;
    setActive((current) =>
      current
        ? {
            ...current,
            messages: [
              ...current.messages,
              {
                id: streamingId,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
              } as ChatMessage,
            ],
          }
        : current,
    );

    let failed: string | null = null;

    await chatApi.stream(
      conversation.id,
      { content },
      {
        onDelta: (text) => {
          setStreamingText((current) => current + text);
        },
        onDone: () => {
          failed = null;
        },
        onError: (message) => {
          failed = message.includes("credit")
            ? "You are out of AI credits."
            : "Message failed. Please try again.";
        },
      },
    );

    if (failed) {
      // The server discards the unanswered turn, so the view must too.
      setActive((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(
                (m) => m.id !== optimistic.id && m.id !== streamingId,
              ),
            }
          : current,
      );
      setInput(content);
      setError(failed);
    } else {
      // Reload rather than patching ids in: the server owns the real message
      // records, and this is one request at the end of a long interaction.
      const fresh = await chatApi.get(conversation.id).catch(() => null);
      if (fresh) setActive(fresh);
      await loadConversations();
    }

    setStreamingText("");
    setSending(false);
  };

  const togglePin = async (conversation: Conversation) => {
    const next = !conversation.is_pinned;
    setConversations((all) =>
      all.map((c) => (c.id === conversation.id ? { ...c, is_pinned: next } : c)),
    );
    try {
      await chatApi.update(conversation.id, { is_pinned: next });
      await loadConversations();
    } catch {
      setConversations((all) =>
        all.map((c) => (c.id === conversation.id ? { ...c, is_pinned: !next } : c)),
      );
    }
  };

  const remove = async (conversation: Conversation) => {
    if (!window.confirm(`Delete "${conversation.title}"?`)) return;
    const snapshot = conversations;
    setConversations((all) => all.filter((c) => c.id !== conversation.id));
    if (active?.id === conversation.id) setActive(null);
    try {
      await chatApi.remove(conversation.id);
    } catch {
      setConversations(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to start chatting."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100vh-13rem)] lg:flex-row">
      {/* History */}
      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <div className="flex items-center gap-2">
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Project context"
            className="flex-1"
          >
            <option value="">No project context</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
          <Button size="icon" aria-label="New chat" onClick={() => void startConversation()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded border border-border/60 px-3 py-2 transition-colors hover:border-primary-500/40",
                  active?.id === c.id && "border-primary-500/60 bg-primary-500/5",
                )}
              >
                <button
                  type="button"
                  onClick={() => void open(c.id)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.total_messages} messages</p>
                </button>
                <button
                  type="button"
                  aria-label={c.is_pinned ? "Unpin conversation" : "Pin conversation"}
                  aria-pressed={c.is_pinned}
                  onClick={() => void togglePin(c)}
                  className={cn(
                    "rounded p-1 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    c.is_pinned
                      ? "text-primary-400"
                      : "text-muted-foreground opacity-0 group-hover:opacity-100",
                  )}
                >
                  <Pin className={cn("h-3.5 w-3.5", c.is_pinned && "fill-primary-400")} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${c.title}`}
                  onClick={() => void remove(c)}
                  className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-error-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <Card className="flex min-h-96 flex-1 flex-col lg:min-h-0">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {active && active.messages.length > 0 ? (
              <div className="flex flex-col gap-5">
                {active.messages.map((m) =>
                  // The placeholder shows whatever has streamed so far;
                  // everything else renders its stored content.
                  m.id.startsWith("streaming-") ? (
                    streamingText ? (
                      <MessageBubble key={m.id} message={{ ...m, content: streamingText }} />
                    ) : null
                  ) : (
                    <MessageBubble key={m.id} message={m} />
                  ),
                )}
                {/* Only think while nothing has arrived yet — once tokens are
                    landing, the answer itself is the progress indicator. */}
                {sending && !streamingText ? <ThinkingBubble /> : null}
                <div ref={threadEndRef} />
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <Sparkles className="h-7 w-7 text-primary-400" aria-hidden />
                <div>
                  <p className="font-display font-semibold">Ask anything about your show</p>
                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Pick a project above and the assistant will use its context and completed
                    research when answering.
                  </p>
                </div>
              </div>
            )}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-error-400">
              {error}
            </p>
          ) : null}

          <form onSubmit={send} className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about angles, guests, structure…"
              aria-label="Message"
              maxLength={20000}
              disabled={sending}
            />
            <Button type="submit" loading={sending} disabled={!input.trim()}>
              {!sending && <Send className="h-4 w-4" />}
              Send
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Each reply uses 1 AI credit.
            {active?.project_id ? null : " Select a project for show-aware answers."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
