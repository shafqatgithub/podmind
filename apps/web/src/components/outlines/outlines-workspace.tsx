"use client";

/**
 * Outline Builder — 11-Feature-Specifications MODULE 6.
 *
 * An outline is a running order, so it is rendered as one: sections in
 * sequence with their time allocation, talking points and the transition
 * that carries the listener onward.
 */

import * as React from "react";
import {
  Clock,
  ListOrdered,
  MessageCircleQuestion,
  Mic,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Skeleton,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { researchApi, type ResearchSession } from "@/lib/api/research";
import {
  OUTLINE_STYLES,
  outlinesApi,
  type Outline,
  type OutlineDetail,
  type OutlineStyle,
} from "@/lib/api/outlines";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item } from "@/components/motion/motion";

function GeneratingCard({ minutes }: { minutes: number }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-6">
        <Sparkles className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
        <div className="flex-1">
          <p className="font-display font-semibold">Structuring a {minutes} minute episode…</p>
          <p className="text-sm text-muted-foreground">
            Hook, sections, talking points and timing. Usually 20–60 seconds.
          </p>
        </div>
        <span className="text-sm tabular-nums text-muted-foreground">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </CardContent>
    </Card>
  );
}

function OutlineView({ outline }: { outline: OutlineDetail }) {
  const meta = outline.metadata ?? {};

  if (meta.unstructured) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <p className="text-sm text-warning-400">
            The model returned unstructured text for this outline.
          </p>
          <p className="whitespace-pre-wrap text-sm">{outline.sections[0]?.description}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize">{outline.outline_type}</Badge>
            {outline.estimated_duration_minutes ? (
              <Badge className="bg-cyan-500/15 text-cyan-300">
                <Clock className="mr-1 h-3 w-3" aria-hidden />
                {outline.estimated_duration_minutes} min
              </Badge>
            ) : null}
            <Badge className="bg-neutral-500/15 text-neutral-300">v{outline.version}</Badge>
            {meta.provider ? (
              <span className="text-xs text-muted-foreground">
                {meta.provider} · {meta.model}
              </span>
            ) : null}
          </div>
          <h2 className="font-display text-xl font-bold">{outline.title}</h2>
          {outline.description ? (
            <p className="text-sm text-muted-foreground">{outline.description}</p>
          ) : null}
        </header>

        {meta.hook ? (
          <section className="rounded border border-primary-500/30 bg-primary-500/5 p-4">
            <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-300">
              <Mic className="h-3.5 w-3.5" aria-hidden />
              Opening hook
            </h3>
            <p className="text-sm">{meta.hook}</p>
          </section>
        ) : null}

        {/* Running order */}
        <section className="flex flex-col gap-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListOrdered className="h-3.5 w-3.5 text-primary-400" aria-hidden />
            Running order
          </h3>

          <ol className="flex flex-col gap-4">
            {outline.sections.map((section, index) => (
              <li key={section.id} className="relative pl-8">
                <span
                  aria-hidden
                  className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/15 font-mono text-xs text-primary-300"
                >
                  {index + 1}
                </span>
                {index < outline.sections.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-3 top-7 h-[calc(100%-1rem)] w-px bg-border"
                  />
                ) : null}

                <div className="flex flex-wrap items-baseline gap-2">
                  <h4 className="font-medium">{section.title}</h4>
                  {section.estimated_minutes ? (
                    <span className="text-xs text-muted-foreground">
                      {section.estimated_minutes} min
                    </span>
                  ) : null}
                </div>

                {section.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                ) : null}

                {section.talking_points?.length ? (
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
                    {section.talking_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                ) : null}

                {section.metadata?.transition ? (
                  <p className="mt-2 border-l-2 border-purple-500/40 pl-3 text-sm italic text-purple-200">
                    {section.metadata.transition}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {meta.call_to_action ? (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Call to action
            </h3>
            <p className="text-sm">{meta.call_to_action}</p>
          </section>
        ) : null}

        {meta.closing ? (
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Closing
            </h3>
            <p className="text-sm">{meta.closing}</p>
          </section>
        ) : null}

        {outline.questions.length ? (
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageCircleQuestion className="h-3.5 w-3.5 text-purple-400" aria-hidden />
              Questions to ask
            </h3>
            <ul className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
              {outline.questions.map((q) => (
                <li key={q.id}>{q.question}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function OutlinesWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [research, setResearch] = React.useState<ResearchSession[]>([]);
  const [outlines, setOutlines] = React.useState<Outline[]>([]);
  const [detail, setDetail] = React.useState<OutlineDetail | null>(null);
  const [style, setStyle] = React.useState<OutlineStyle>("solo");
  const [duration, setDuration] = React.useState(30);
  const [generating, setGenerating] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadOutlines = React.useCallback(async (signal?: AbortSignal) => {
    const page = await outlinesApi.list(undefined, signal);
    setOutlines(page.items);
    return page.items;
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [projectPage, researchPage, items] = await Promise.all([
          projectsApi.list({ limit: 100 }, controller.signal),
          researchApi.list({ limit: 50 }, controller.signal).catch(() => ({ items: [] })),
          loadOutlines(controller.signal),
        ]);
        setProjects(projectPage.items.filter((p) => !p.is_archived));
        setResearch(researchPage.items as ResearchSession[]);
        const latest = items[0];
        if (latest) setDetail(await outlinesApi.get(latest.id, controller.signal));
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadOutlines]);

  const generate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project_id = String(form.get("project_id") ?? "");
    const topic = String(form.get("topic") ?? "").trim();
    const research_session_id = String(form.get("research_session_id") ?? "");
    const guest_name = String(form.get("guest_name") ?? "").trim();

    if (!project_id || topic.length < 3) {
      setError("Choose a project and describe the episode topic.");
      return;
    }

    setGenerating(true);
    setError(null);
    setDetail(null);
    try {
      const created = await outlinesApi.create({
        project_id,
        topic,
        style,
        duration_minutes: duration,
        ...(research_session_id ? { research_session_id } : {}),
        ...(guest_name ? { guest_name } : {}),
      });
      setDetail(await outlinesApi.get(created.id));
      await loadOutlines();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "INSUFFICIENT_CREDITS"
            ? "You are out of AI credits."
            : err.message
          : "Could not build the outline.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this outline?")) return;
    const snapshot = outlines;
    setOutlines((all) => all.filter((o) => o.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await outlinesApi.remove(id);
    } catch {
      setOutlines(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to build outlines."
      />
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={ListOrdered}
        title="Create a project first"
        description="An outline belongs to a project, so it can inherit your show's voice and audience."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={generate} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project_id">Project</Label>
                  {loading ? (
                    <Skeleton className="h-10 rounded" />
                  ) : (
                    <Select id="project_id" name="project_id" required defaultValue="">
                      <option value="" disabled>
                        Choose a project
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="style">Episode style</Label>
                  <Select
                    id="style"
                    name="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as OutlineStyle)}
                  >
                    {OUTLINE_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {OUTLINE_STYLES.find((s) => s.value === style)?.hint}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="topic">Episode topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    maxLength={500}
                    placeholder="Why attention became the product"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="duration">Target length</Label>
                  <Select
                    id="duration"
                    value={String(duration)}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    {[15, 20, 30, 45, 60, 90].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="research_session_id">Build on research (optional)</Label>
                  <Select id="research_session_id" name="research_session_id" defaultValue="">
                    <option value="">None — start fresh</option>
                    {research.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </Select>
                </div>

                {style === "interview" ? (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="guest_name">Guest name (optional)</Label>
                    <Input id="guest_name" name="guest_name" maxLength={200} />
                  </div>
                ) : null}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={generating}>
                  <Sparkles className="h-4 w-4" />
                  Build outline
                </Button>
                <span className="text-xs text-muted-foreground">Uses 5 AI credits</span>
              </div>
            </form>
          </CardContent>
        </Card>

        {generating ? <GeneratingCard minutes={duration} /> : null}

        {detail && !generating ? (
          <Appear className="flex flex-col gap-4">
            <Item>
              <OutlineView outline={detail} />
            </Item>
          </Appear>
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-64 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Outlines
        </h2>
        {outlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your outlines will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {outlines.map((o) => (
              <li key={o.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === o.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void outlinesApi.get(o.id).then(setDetail)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{o.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span className="capitalize">{o.outline_type}</span>
                      {o.estimated_duration_minutes ? ` · ${o.estimated_duration_minutes}m` : ""}
                      {o.is_current ? " · current" : ` · v${o.version}`}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${o.title}`}
                    onClick={() => void remove(o.id)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-error-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
