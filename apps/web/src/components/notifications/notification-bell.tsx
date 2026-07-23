"use client";

/**
 * Notification bell.
 *
 * Polls rather than holding a socket open: notifications here are not
 * time-critical, and a 60-second poll costs far less than a websocket the app
 * would then have to keep alive, reconnect and authenticate. Polling pauses
 * while the tab is hidden so a backgrounded tab is not making requests all day.
 */

import * as React from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Badge, Button, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { notificationsApi, type Notification } from "@/lib/api/notifications";

const POLL_MS = 60_000;

const TYPE_STYLES: Record<string, string> = {
  system: "bg-neutral-500/15 text-neutral-300",
  project: "bg-primary-500/15 text-primary-300",
  research: "bg-purple-500/15 text-purple-300",
  billing: "bg-warning-500/15 text-warning-300",
  security: "bg-error-500/15 text-error-300",
  announcement: "bg-cyan-500/15 text-cyan-300",
  marketing: "bg-neutral-500/15 text-neutral-300",
};

function relativeTime(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function NotificationBell() {
  const [items, setItems] = React.useState<Notification[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [unavailable, setUnavailable] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await notificationsApi.list({ limit: 20 }, signal);
      setItems(result.items);
      setUnread(result.unread_count);
      setUnavailable(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      // A missing backend should not put an error in the header chrome.
      if (err instanceof ApiError && err.isUnreachable) setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isApiConfigured()) {
      setLoading(false);
      setUnavailable(true);
      return;
    }
    const controller = new AbortController();
    void load(controller.signal);

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [load]);

  // Close on outside click and on Escape.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (unavailable) return null;

  const markRead = async (id: string) => {
    setItems((all) => all.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnread((u) => Math.max(u - 1, 0));
    try {
      await notificationsApi.markRead(id);
    } catch {
      await load();
    }
  };

  const markAll = async () => {
    setItems((all) => all.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
    try {
      await notificationsApi.markAllRead();
    } catch {
      await load();
    }
  };

  const remove = async (id: string) => {
    const snapshot = items;
    setItems((all) => all.filter((n) => n.id !== id));
    try {
      await notificationsApi.remove(id);
    } catch {
      setItems(snapshot);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-gradient px-1 text-[10px] font-semibold text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-lg border border-primary-500/20 bg-card/95 shadow-soft backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <h2 className="font-display text-sm font-semibold">Notifications</h2>
            {unread > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => void markAll()}>
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col gap-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "group flex items-start gap-2 px-4 py-3",
                      !n.is_read && "bg-primary-500/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px] capitalize", TYPE_STYLES[n.type])}>
                          {n.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </span>
                      </div>
                      {n.action_url ? (
                        <Link
                          href={n.action_url}
                          onClick={() => setOpen(false)}
                          className="mt-1 block text-sm font-medium hover:text-primary-300"
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <p className="mt-1 text-sm font-medium">{n.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-1">
                      {!n.is_read ? (
                        <button
                          type="button"
                          aria-label="Mark as read"
                          onClick={() => void markRead(n.id)}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-success-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Delete notification"
                        onClick={() => void remove(n.id)}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-error-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
