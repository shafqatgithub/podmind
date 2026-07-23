"use client";

/**
 * Dashboard.
 *
 * Built to the supplied design, but every number on it is something the
 * product actually recorded. There is deliberately no "hours saved" tile:
 * we have no honest way to measure that, and a figure derived from invented
 * multipliers would look impressive while telling the reader nothing.
 *
 * Three columns on wide screens — tools and history in the main area, a rail
 * for credits and shortcuts — collapsing to one on mobile.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  FileText,
  FolderKanban,
  ListOrdered,
  MessageSquare,
  Plus,
  ScanSearch,
  Search,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { dashboardApi, type DashboardOverview } from "@/lib/api/dashboard";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/common/empty-state";
import { Item, LiftCard, Reveal } from "@/components/motion/motion";

/* ------------------------------------------------------------ config */

const TOOLS = [
  {
    href: "/agents",
    title: "Episode Pipeline",
    description: "One topic to a full episode package.",
    icon: Workflow,
    tint: "text-primary-300",
    ring: "border-primary-500/30",
    glow: "bg-primary-500/15",
    badge: "NEW",
  },
  {
    href: "/chat",
    title: "AI Chat",
    description: "Ideas, answers and content — with your project in context.",
    icon: MessageSquare,
    tint: "text-cyan-300",
    ring: "border-cyan-500/30",
    glow: "bg-cyan-500/15",
    badge: null,
  },
  {
    href: "/research",
    title: "AI Research",
    description: "Facts, statistics and angles in minutes.",
    icon: Search,
    tint: "text-purple-300",
    ring: "border-purple-500/30",
    glow: "bg-purple-500/15",
    badge: null,
  },
  {
    href: "/scripts",
    title: "Content Builder",
    description: "Outlines, scripts and show notes.",
    icon: FileText,
    tint: "text-warning-300",
    ring: "border-warning-500/30",
    glow: "bg-warning-500/15",
    badge: null,
  },
  {
    href: "/guests",
    title: "Guest Assistant",
    description: "Backgrounds, questions and what to verify.",
    icon: Users,
    tint: "text-violet-300",
    ring: "border-violet-500/30",
    glow: "bg-violet-500/15",
    badge: null,
  },
  {
    href: "/seo",
    title: "Growth Engine",
    description: "SEO, social posts and analytics.",
    icon: TrendingUp,
    tint: "text-success-300",
    ring: "border-success-500/30",
    glow: "bg-success-500/15",
    badge: null,
  },
] as const;

const TEMPLATES = [
  {
    href: "/agents",
    title: "Full episode package",
    description: "Research through script in one run.",
    icon: Workflow,
    tint: "text-primary-300",
  },
  {
    href: "/guests",
    title: "Interview questions",
    description: "Smart questions for your next guest.",
    icon: Users,
    tint: "text-violet-300",
  },
  {
    href: "/seo",
    title: "Show notes & SEO",
    description: "Titles, chapters and keywords.",
    icon: ListOrdered,
    tint: "text-success-300",
  },
  {
    href: "/fact-checks",
    title: "Fact check a script",
    description: "Verify claims before you record.",
    icon: ScanSearch,
    tint: "text-warning-300",
  },
] as const;

const QUICK_ACTIONS = [
  { href: "/chat", label: "New AI Chat", icon: MessageSquare },
  { href: "/research", label: "Start Research", icon: Search },
  { href: "/projects", label: "Create New Project", icon: FolderKanban },
  { href: "/knowledge", label: "Upload Document", icon: Upload },
] as const;

const ACTIVITY_ICONS: Record<string, typeof FileText> = {
  projects: FolderKanban,
  research_sessions: Search,
  scripts: FileText,
  outlines: ListOrdered,
  guests: Users,
  knowledge_documents: BookOpen,
  ai_conversations: MessageSquare,
  ai_memories: Brain,
  social_posts: Share2,
};

/* ------------------------------------------------------------ pieces */

function ToolCard({ tool }: { tool: (typeof TOOLS)[number] }) {
  const Icon = tool.icon;
  return (
    <LiftCard>
      <Link
        href={tool.href}
        className="group flex h-full flex-col gap-3 rounded-lg border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex items-start justify-between">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg border",
              tool.ring,
              tool.glow,
            )}
          >
            <Icon className={cn("h-5 w-5", tool.tint)} aria-hidden />
          </span>
          {tool.badge ? (
            <Badge className="bg-primary-500/20 text-[10px] text-primary-300">{tool.badge}</Badge>
          ) : null}
        </div>

        <div>
          <h3 className="font-display font-semibold">{tool.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
        </div>

        <span
          aria-hidden
          className="mt-auto flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary-500/40 group-hover:text-primary-300"
        >
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </LiftCard>
  );
}

function StatTile({
  label,
  value,
  changePct,
}: {
  label: string;
  value: number;
  changePct?: number | null;
}) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value.toLocaleString()}</p>
      {/* A trend appears only when last month gives a baseline — "+100%" from
          zero is noise dressed as insight. */}
      {changePct !== null && changePct !== undefined ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            changePct >= 0 ? "text-success-300" : "text-error-300",
          )}
        >
          <ArrowUpRight className={cn("h-3 w-3", changePct < 0 && "rotate-90")} aria-hidden />
          {Math.abs(changePct)}% this month
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">No comparison yet</p>
      )}
    </div>
  );
}

/** Credit spend over the last 30 days. */
function CreditChart({ series }: { series: { day: string; credits: number }[] }) {
  const width = 720;
  const height = 160;
  const peak = Math.max(1, ...series.map((d) => d.credits));

  if (series.length < 2) return null;

  const points = series.map((d, i) => ({
    x: (i / (series.length - 1)) * width,
    y: height - (d.credits / peak) * (height - 20) - 10,
  }));

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Credit usage over ${series.length} days, peaking at ${peak} in a day`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="credit-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(45 140 255)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(123 63 242)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="credit-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(56 189 248)" />
            <stop offset="100%" stopColor="rgb(168 85 247)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#credit-fill)" />
        <path
          d={line}
          fill="none"
          stroke="url(#credit-line)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{fmt(series[0]?.day)}</span>
        <span>Peak {peak.toLocaleString()} credits in a day</span>
        <span>{fmt(series[series.length - 1]?.day)}</span>
      </div>
    </div>
  );
}

function useFirstName(): string | null {
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      const full = data.user?.user_metadata?.full_name as string | undefined;
      setName(full ? (full.split(" ")[0] ?? null) : null);
    });
  }, []);

  return name;
}

/* -------------------------------------------------------------- page */

export function DashboardWorkspace() {
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const firstName = useFirstName();

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setData(await dashboardApi.overview(controller.signal));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError && err.isUnreachable
            ? "The PodMind API is not reachable right now."
            : "Could not load your dashboard.",
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to see your dashboard."
      />
    );
  }

  const credits = data?.credits;
  const allowance = credits?.allowance ?? null;
  const usedPct =
    allowance && allowance > 0
      ? Math.min(100, Math.round(((credits?.used ?? 0) / allowance) * 100))
      : null;

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Let&apos;s create something worth listening to.
            </p>
          </div>
          <Button asChild>
            <Link href="/projects">
              <Plus className="h-4 w-4" />
              New project
            </Link>
          </Button>
        </div>

        {error ? (
          <Card>
            <CardContent className="p-5">
              <p role="alert" className="text-sm text-error-400">
                {error}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Item key={tool.href}>
              <ToolCard tool={tool} />
            </Item>
          ))}
        </Reveal>

        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Overview</h2>
              <span className="text-xs text-muted-foreground">Last 30 days</span>
            </div>

            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : data ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatTile
                    label="Projects"
                    value={data.stats.projects}
                    changePct={data.stats.projects_change_pct}
                  />
                  <StatTile label="Documents" value={data.stats.documents} />
                  <StatTile
                    label="Credits used this month"
                    value={data.stats.credits_used_this_month}
                    changePct={data.stats.credits_change_pct}
                  />
                  <StatTile label="Content created" value={data.stats.content_created} />
                </div>
                <CreditChart series={data.credit_series} />
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold">Recent projects</h2>
                <Link
                  href="/projects"
                  className="text-xs text-primary-400 hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  View all
                </Link>
              </div>

              {loading ? (
                <Skeleton className="h-32 rounded" />
              ) : data && data.recent_projects.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {data.recent_projects.map((project) => (
                    <li key={project.id}>
                      <Link
                        href="/projects"
                        className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-xs font-bold text-white">
                          {project.title.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {project.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {new Date(project.updated_at).toLocaleDateString()} ·{" "}
                            {project.document_count} document
                            {project.document_count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <Badge className="capitalize">{project.status}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No projects yet — create one to get started.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-4 p-6">
              <h2 className="font-display font-semibold">Quick start</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <Link
                    key={t.title}
                    href={t.href}
                    className="flex flex-col gap-1.5 rounded-lg border border-border/60 p-3 transition-colors hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <t.icon className={cn("h-4 w-4", t.tint)} aria-hidden />
                    <span className="text-sm font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.description}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right rail */}
      <aside className="flex w-full flex-col gap-4 xl:w-80 xl:shrink-0">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold">AI Credits</h2>
              {credits?.plan_name ? (
                <Badge className="bg-primary-500/15 text-primary-300">{credits.plan_name}</Badge>
              ) : null}
            </div>

            {loading ? (
              <Skeleton className="h-20 rounded" />
            ) : (
              <>
                <p className="font-display text-2xl font-bold">
                  {(credits?.available ?? 0).toLocaleString()}
                  {allowance ? (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {allowance.toLocaleString()}
                    </span>
                  ) : null}
                </p>

                {/* A bar needs a ceiling to mean anything; on the free tier
                    there is no plan row, so the balance stands on its own. */}
                {usedPct !== null ? (
                  <>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-border"
                      role="progressbar"
                      aria-valuenow={usedPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Credits used"
                    >
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${usedPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{usedPct}% used</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {(credits?.used ?? 0).toLocaleString()} used so far
                  </p>
                )}

                {credits?.period_end ? (
                  <p className="text-xs text-muted-foreground">
                    Renews {new Date(credits.period_end).toLocaleDateString()}
                  </p>
                ) : null}
              </>
            )}

            <Button asChild className="mt-1 w-full">
              <Link href="/billing">Upgrade plan</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <h2 className="font-display font-semibold">Recent activity</h2>
            {loading ? (
              <Skeleton className="h-32 rounded" />
            ) : data && data.recent_activity.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {data.recent_activity.slice(0, 6).map((event, i) => {
                  const Icon = ACTIVITY_ICONS[event.resource_type] ?? Sparkles;
                  return (
                    <li key={`${event.created_at}-${i}`} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary-500/25 bg-primary-500/10">
                        <Icon className="h-3.5 w-3.5 text-primary-300" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm capitalize">
                          {event.action.toLowerCase()} {event.resource_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.created_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your activity will appear here as you work.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <h2 className="mb-1 font-display font-semibold">Quick actions</h2>
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm transition-colors hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <action.icon className="h-4 w-4 text-primary-300" aria-hidden />
                {action.label}
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden />
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
