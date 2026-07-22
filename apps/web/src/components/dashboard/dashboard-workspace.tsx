"use client";

/**
 * Dashboard — the central workspace (11-Feature-Specifications MODULE 2).
 *
 * Only widgets with real data behind them are shown. Subscription, guests and
 * notifications arrive with their own modules; an empty placeholder that
 * never fills in is worse than not showing the widget at all.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Coins,
  FolderKanban,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { dashboardApi, type DashboardOverview } from "@/lib/api/dashboard";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item } from "@/components/motion/motion";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-neutral-500/15 text-neutral-300",
  research: "bg-purple-500/15 text-purple-300",
  outline: "bg-cyan-500/15 text-cyan-300",
  writing: "bg-primary-500/15 text-primary-300",
  review: "bg-warning-500/15 text-warning-300",
  published: "bg-success-500/15 text-success-300",
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(iso).toLocaleDateString();
}

const QUICK_ACTIONS = [
  { href: "/projects", label: "New project", icon: FolderKanban },
  { href: "/research", label: "Run research", icon: Search },
  { href: "/chat", label: "Ask the assistant", icon: MessageSquare },
  { href: "/knowledge", label: "Add a document", icon: BookOpen },
] as const;

function SectionCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h2>
          <Link
            href={href}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
          >
            {linkLabel}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function DashboardWorkspace() {
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setData(await dashboardApi.overview(controller.signal));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Could not load your dashboard.");
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to see your workspace."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p role="alert" className="text-sm text-error-400">
            {error ?? "Could not load your dashboard."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { weekly } = data;
  const trend = weekly.research_trend_pct;

  return (
    <Appear className="flex flex-col gap-6">
      {/* Quick actions */}
      <Item>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.href} variant="secondary" asChild>
              <Link href={action.href}>
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      </Item>

      {/* Credits + weekly progress */}
      <Item>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Coins className="h-3.5 w-3.5 text-warning-400" aria-hidden />
                Credits left
              </span>
              <span className="font-display text-2xl font-bold">
                {data.credits.available.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {data.credits.used.toLocaleString()} used
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <Search className="h-3.5 w-3.5 text-purple-400" aria-hidden />
                Research this week
              </span>
              <span className="font-display text-2xl font-bold">
                {weekly.research_this_week}
              </span>
              {trend === null ? (
                <span className="text-xs text-muted-foreground">No prior week to compare</span>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1 text-xs",
                    trend >= 0 ? "text-success-300" : "text-warning-300",
                  )}
                >
                  {trend >= 0 ? (
                    <TrendingUp className="h-3 w-3" aria-hidden />
                  ) : (
                    <TrendingDown className="h-3 w-3" aria-hidden />
                  )}
                  {trend >= 0 ? "+" : ""}
                  {trend}% vs last week
                </span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-primary-400" aria-hidden />
                Messages this week
              </span>
              <span className="font-display text-2xl font-bold">
                {weekly.messages_this_week}
              </span>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-1.5 p-5">
              <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                Documents added
              </span>
              <span className="font-display text-2xl font-bold">
                {weekly.documents_this_week}
              </span>
              <span className="text-xs text-muted-foreground">in the last 7 days</span>
            </CardContent>
          </Card>
        </div>
      </Item>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent projects */}
        <Item>
          <SectionCard title="Recent projects" href="/projects" linkLabel="All projects">
            {data.recent_projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet.{" "}
                <Link href="/projects" className="text-primary-400 hover:text-primary-300">
                  Create your first
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent_projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href="/projects"
                      className="flex items-center gap-2 rounded border border-border/50 px-3 py-2 transition-colors hover:border-primary-500/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{project.title}</span>
                      <Badge
                        className={cn(
                          "text-[10px] capitalize",
                          STATUS_STYLE[project.status] ?? "",
                        )}
                      >
                        {project.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(project.updated_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </Item>

        {/* Recent research */}
        <Item>
          <SectionCard title="Recent research" href="/research" linkLabel="Research">
            {data.recent_research.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No research yet.{" "}
                <Link href="/research" className="text-primary-400 hover:text-primary-300">
                  Run your first briefing
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent_research.map((item) => (
                  <li
                    key={item.id}
                    className="rounded border border-border/50 px-3 py-2"
                  >
                    <p className="truncate text-sm">{item.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      {item.project_title ? <span>{item.project_title}</span> : null}
                      <span className="capitalize">· {item.depth}</span>
                      {item.confidence_score !== null ? (
                        <span>· {Math.round(item.confidence_score * 100)}% confidence</span>
                      ) : null}
                      <span>· {timeAgo(item.created_at)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </Item>

        {/* Conversations */}
        <Item>
          <SectionCard title="Recent conversations" href="/chat" linkLabel="AI Chat">
            {data.recent_conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No conversations yet.{" "}
                <Link href="/chat" className="text-primary-400 hover:text-primary-300">
                  Ask the assistant
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.recent_conversations.map((c) => (
                  <li key={c.id}>
                    <Link
                      href="/chat"
                      className="flex items-center gap-2 rounded border border-border/50 px-3 py-2 transition-colors hover:border-primary-500/40"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">{c.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.total_messages} msgs
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </Item>

        {/* Activity */}
        <Item>
          <SectionCard title="Recent activity" href="/analytics" linkLabel="Analytics">
            {data.recent_activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has happened yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {data.recent_activity.map((event, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        event.action === "INSERT"
                          ? "bg-success-500"
                          : event.action === "DELETE"
                            ? "bg-error-500"
                            : "bg-primary-500",
                      )}
                    />
                    <span className="capitalize text-muted-foreground">
                      {event.action.toLowerCase()}
                    </span>
                    <span className="capitalize">{event.resource_type.replace(/_/g, " ")}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {timeAgo(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </Item>
      </div>

      {data.recent_projects.length === 0 ? (
        <Item>
          <Card>
            <CardContent className="flex flex-col items-start gap-3 p-6">
              <h2 className="font-display font-semibold">Start here</h2>
              <p className="text-sm text-muted-foreground">
                Create a project, run research on your topic, then ask the assistant about it —
                it will use that research when it answers.
              </p>
              <Button asChild>
                <Link href="/projects">
                  <Plus className="h-4 w-4" />
                  Create your first project
                </Link>
              </Button>
            </CardContent>
          </Card>
        </Item>
      ) : null}
    </Appear>
  );
}
