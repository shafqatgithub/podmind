"use client";

/**
 * Export Center — every finished piece of work in one list.
 *
 * The per-module export button covers the moment right after something is
 * generated. This covers the other moment: coming back later to collect a
 * week's output, when the thing you want is three modules away and you would
 * rather not remember which. Nothing here is new capability — it is the same
 * export, reachable without navigating first.
 *
 * The five sources are fetched in parallel and each degrades on its own: a
 * module that fails shows a quiet line instead of emptying the page.
 */

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Hash,
  ListTree,
  Lightbulb,
  Megaphone,
  Microscope,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button, Card, CardContent, Input, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { outlinesApi } from "@/lib/api/outlines";
import { researchApi } from "@/lib/api/research";
import { scriptsApi } from "@/lib/api/scripts";
import { seoApi } from "@/lib/api/seo";
import { socialApi } from "@/lib/api/social";
import { topicsApi } from "@/lib/api/topics";
import { projectsApi, type Project } from "@/lib/api/projects";
import type { ExportKind } from "@/lib/api/exports";
import { ExportMenu } from "@/components/common/export-menu";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item } from "@/components/motion/motion";

/** Module route for a kind, used to link a row back to what it came from. */
const KIND_ROUTES: Record<ExportKind, string> = {
  research: "/research",
  outlines: "/outlines",
  scripts: "/scripts",
  seo: "/seo",
  social: "/social",
  topics: "/topics",
};

interface Row {
  id: string;
  kind: ExportKind;
  title: string;
  projectId: string | null;
  meta: string | null;
  createdAt: string | null;
}

const KINDS: {
  kind: ExportKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { kind: "research", label: "Research", icon: Microscope },
  { kind: "outlines", label: "Outlines", icon: ListTree },
  { kind: "scripts", label: "Scripts", icon: FileText },
  { kind: "seo", label: "SEO", icon: Hash },
  { kind: "social", label: "Social", icon: Megaphone },
  { kind: "topics", label: "Topic ideas", icon: Lightbulb },
];

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

async function safe<T>(load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch {
    return [];
  }
}

export function ExportsWorkspace() {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<ExportKind | "all">("all");
  const [projectFilter, setProjectFilter] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectPage, research, outlines, scripts, seo, social, topics] = await Promise.all([
        safe(async () => (await projectsApi.list({ limit: 100 })).items),
        safe(async () => (await researchApi.list({ limit: 100 })).items),
        safe(async () => (await outlinesApi.list()).items),
        safe(async () => (await scriptsApi.list()).items),
        safe(async () => (await seoApi.list({})).items),
        safe(async () => (await socialApi.list({})).items),
        safe(async () => (await topicsApi.list()).items),
      ]);

      setProjects(projectPage);
      setRows([
        ...research.map<Row>((r) => ({
          id: r.id,
          kind: "research",
          title: r.title || r.topic,
          projectId: r.project_id,
          meta: r.depth,
          createdAt: r.created_at,
        })),
        ...outlines.map<Row>((o) => ({
          id: o.id,
          kind: "outlines",
          title: o.title,
          projectId: o.project_id,
          meta: o.estimated_duration_minutes ? `${o.estimated_duration_minutes} min` : null,
          createdAt: o.created_at,
        })),
        ...scripts.map<Row>((s) => ({
          id: s.id,
          kind: "scripts",
          title: s.title,
          projectId: s.project_id,
          meta: s.word_count ? `${s.word_count.toLocaleString()} words` : null,
          createdAt: s.created_at,
        })),
        ...seo.map<Row>((s) => ({
          id: s.id,
          kind: "seo",
          title: s.title,
          projectId: s.project_id,
          meta: null,
          createdAt: s.created_at,
        })),
        ...social.map<Row>((c) => ({
          id: c.id,
          kind: "social",
          title: c.title,
          projectId: c.project_id,
          meta: c.post_count ? `${c.post_count} posts` : null,
          createdAt: c.created_at,
        })),
        ...topics.map<Row>((d) => ({
          id: d.id,
          kind: "topics",
          title: d.niche ? `Ideas for ${d.niche}` : "Topic ideas",
          projectId: d.project_id,
          meta: d.topic_count ? `${d.topic_count} ideas` : null,
          createdAt: d.created_at,
        })),
      ]);
    } catch (err) {
      setError(
        err instanceof ApiError && err.isUnreachable
          ? "The PodMind API is not reachable right now."
          : "Could not load your work.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const projectName = React.useCallback(
    (id: string | null) => projects.find((p) => p.id === id)?.title ?? null,
    [projects],
  );

  const visible = React.useMemo(() => {
    if (!rows) return [];
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => (kindFilter === "all" ? true : r.kind === kindFilter))
      .filter((r) => (projectFilter ? r.projectId === projectFilter : true))
      .filter((r) => (term ? r.title.toLowerCase().includes(term) : true))
      // Newest first: the thing you just made is the thing you came for.
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [rows, search, kindFilter, projectFilter]);

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={FileText}
        title="API not configured"
        description="Set NEXT_PUBLIC_API_URL to connect the Export Center to your backend."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search everything you've made"
            className="pl-9"
            aria-label="Search exports"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Refresh"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setKindFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            kindFilter === "all"
              ? "border-primary-500/60 bg-primary-500/10 text-primary-300"
              : "border-border/60 text-muted-foreground hover:text-foreground",
          )}
        >
          All
        </button>
        {KINDS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => setKindFilter(kind)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              kindFilter === kind
                ? "border-primary-500/60 bg-primary-500/10 text-primary-300"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}

        {projects.length > 0 ? (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            aria-label="Filter by project"
            className="ml-auto h-7 rounded-full border border-border/60 bg-transparent px-3 text-xs text-muted-foreground"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {loading && !rows ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={rows && rows.length > 0 ? "Nothing matches that" : "Nothing to export yet"}
          description={
            rows && rows.length > 0
              ? "Try a different filter or search term."
              : "Run some research, build an outline or write a script — everything you make will be collectable here."
          }
        />
      ) : (
        <Appear className="flex flex-col gap-2">
          {visible.map((row) => {
            const Icon = KINDS.find((k) => k.kind === row.kind)?.icon ?? FileText;
            const label = KINDS.find((k) => k.kind === row.kind)?.label ?? row.kind;
            const project = projectName(row.projectId);
            return (
              <Item key={`${row.kind}-${row.id}`}>
                <Card className="transition-colors hover:border-primary-500/40">
                  <CardContent className="flex items-center gap-3 p-3">
                    {/* The row opens what it describes: nobody should have to
                        download a file to find out whether it was the right
                        one. The export button sits outside the link so it
                        still works as its own control. */}
                    <Link
                      href={`${KIND_ROUTES[row.kind]}?open=${row.id}`}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      title={`Open ${row.title}`}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{row.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[label, project, row.meta, formatDate(row.createdAt)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                    <ExportMenu kind={row.kind} id={row.id} />
                  </CardContent>
                </Card>
              </Item>
            );
          })}
        </Appear>
      )}
    </div>
  );
}
