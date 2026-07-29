"use client";

/**
 * Everything produced under one project, in one place.
 *
 * Each module already stores `project_id`, but until now that link was only
 * ever read from inside the module itself — so a podcaster who ran research
 * for a show had no way to see it from the show. This panel closes that loop:
 * open a project, see its research, outlines, scripts, SEO sets and social
 * campaigns, and jump straight into the module to work on any of them.
 *
 * The five lists are fetched in parallel and each one degrades on its own: a
 * module that fails or is empty shows a quiet line rather than taking the
 * whole panel down with it.
 */

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Hash,
  ListTree,
  Megaphone,
  Microscope,
  RefreshCw,
} from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, cn } from "@podmind/ui";
import { outlinesApi } from "@/lib/api/outlines";
import { researchApi } from "@/lib/api/research";
import { scriptsApi } from "@/lib/api/scripts";
import { seoApi } from "@/lib/api/seo";
import { socialApi } from "@/lib/api/social";

/** One row in a section: whatever the module calls its items, reduced to this. */
interface ContentItem {
  id: string;
  title: string;
  meta: string | null;
  createdAt: string | null;
}

interface Section {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ContentItem[];
  failed: boolean;
}

const EMPTY_HINTS: Record<string, string> = {
  research: "No research yet — run one from the Research module.",
  outlines: "No outlines yet — build one from research.",
  scripts: "No scripts yet — write one from an outline.",
  seo: "No SEO sets yet.",
  social: "No social campaigns yet.",
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Resolve a list without letting one failure abort the others.
 * Returns an empty list and a failed flag instead of throwing.
 */
async function safeList<T>(load: () => Promise<T[]>): Promise<{ items: T[]; failed: boolean }> {
  try {
    return { items: await load(), failed: false };
  } catch {
    return { items: [], failed: true };
  }
}

export function ProjectContentPanel({ projectId }: { projectId: string }) {
  const [sections, setSections] = React.useState<Section[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);

      const [research, outlines, scripts, seo, social] = await Promise.all([
        safeList(async () =>
          (await researchApi.list({ project_id: projectId, limit: 5 }, signal)).items,
        ),
        safeList(async () => (await outlinesApi.list(projectId, signal)).items),
        safeList(async () => (await scriptsApi.list(projectId, signal)).items),
        safeList(async () => (await seoApi.list({ project_id: projectId }, signal)).items),
        safeList(async () => (await socialApi.list({ project_id: projectId }, signal)).items),
      ]);

      if (signal?.aborted) return;

      setSections([
        {
          key: "research",
          label: "Research",
          href: "/research",
          icon: Microscope,
          failed: research.failed,
          items: research.items.slice(0, 5).map((r) => ({
            id: r.id,
            title: r.title || r.topic,
            meta: r.depth,
            createdAt: r.created_at,
          })),
        },
        {
          key: "outlines",
          label: "Outlines",
          href: "/outlines",
          icon: ListTree,
          failed: outlines.failed,
          items: outlines.items.slice(0, 5).map((o) => ({
            id: o.id,
            title: o.title,
            meta: o.estimated_duration_minutes ? `${o.estimated_duration_minutes} min` : null,
            createdAt: o.created_at,
          })),
        },
        {
          key: "scripts",
          label: "Scripts",
          href: "/scripts",
          icon: FileText,
          failed: scripts.failed,
          items: scripts.items.slice(0, 5).map((s) => ({
            id: s.id,
            title: s.title,
            meta: s.word_count ? `${s.word_count.toLocaleString()} words` : null,
            createdAt: s.created_at,
          })),
        },
        {
          key: "seo",
          label: "SEO",
          href: "/seo",
          icon: Hash,
          failed: seo.failed,
          items: seo.items.slice(0, 5).map((s) => ({
            id: s.id,
            title: s.title,
            meta: null,
            createdAt: s.created_at,
          })),
        },
        {
          key: "social",
          label: "Social",
          href: "/social",
          icon: Megaphone,
          failed: social.failed,
          items: social.items.slice(0, 5).map((c) => ({
            id: c.id,
            title: c.title,
            meta: c.post_count ? `${c.post_count} posts` : null,
            createdAt: c.created_at,
          })),
        },
      ]);
      setLoading(false);
    },
    [projectId],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totalItems = sections?.reduce((sum, s) => sum + s.items.length, 0) ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Work in this project</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void load()}
          disabled={loading}
          aria-label="Refresh project content"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !sections ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-52" />
          </div>
        ) : (
          <>
            {totalItems === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Nothing has been created in this project yet. Run research, then build an
                outline and a script from it — everything you make will collect here.
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sections?.map((section) => {
                const Icon = section.icon;
                return (
                  <section key={section.key} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-foreground">{section.label}</h3>
                      {section.items.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {section.items.length}
                        </span>
                      ) : null}
                    </div>

                    {section.failed ? (
                      <p className="text-xs text-muted-foreground">
                        Couldn&rsquo;t load {section.label.toLowerCase()}.
                      </p>
                    ) : section.items.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {EMPTY_HINTS[section.key]}
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {section.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={section.href}
                              className="group flex items-baseline justify-between gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/50"
                            >
                              <span className="truncate text-foreground group-hover:text-primary-400">
                                {item.title}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.meta ?? formatDate(item.createdAt)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
