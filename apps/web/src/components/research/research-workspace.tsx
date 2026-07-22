"use client";

/**
 * Research workspace — the module the AI Router was built for.
 *
 * A research run takes real time (tens of seconds), so the UI commits to an
 * honest progress state rather than a spinner: the user sees which stage the
 * request is in and that it is expected to be slow.
 */

import * as React from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Clock,
  ExternalLink,
  Lightbulb,
  MessageCircleQuestion,
  Quote,
  Scale,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
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
  Textarea,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import {
  RESEARCH_DEPTHS,
  researchApi,
  type ResearchDepth,
  type ResearchSession,
  type ResearchSessionDetail,
  type ResearchResult,
} from "@/lib/api/research";
import { EmptyState } from "@/components/common/empty-state";
import { ExportMenu } from "@/components/common/export-menu";
import { Appear, Item } from "@/components/motion/motion";

/* --------------------------------------------------------- progress */

const STAGES = [
  "Reading your project context",
  "Routing to the best model for research",
  "Gathering facts, statistics and sources",
  "Structuring the briefing",
] as const;

/** Advances through named stages so a long wait still feels accountable. */
function ResearchProgress({ depth }: { depth: ResearchDepth }) {
  const [stage, setStage] = React.useState(0);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    const stageTimer = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      depth === "deep" ? 12000 : 6000,
    );
    const clock = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      clearInterval(stageTimer);
      clearInterval(clock);
    };
  }, [depth]);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
          <p className="font-display font-semibold">Researching…</p>
          <span className="ml-auto flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
        </div>

        <ol className="flex flex-col gap-2" aria-live="polite">
          {STAGES.map((label, i) => (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 text-sm transition-colors",
                i < stage && "text-muted-foreground",
                i === stage && "text-foreground",
                i > stage && "text-muted-foreground/50",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  i < stage && "bg-success-500",
                  i === stage && "animate-pulse bg-primary-400",
                  i > stage && "bg-border",
                )}
              />
              {label}
            </li>
          ))}
        </ol>

        <p className="text-xs text-muted-foreground">
          {depth === "deep"
            ? "Deep research is thorough — this usually takes a minute or two."
            : "This usually takes 20–60 seconds."}
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------ result */

function Section({
  icon: Icon,
  title,
  children,
  accent = "text-primary-400",
}: {
  icon: typeof Sparkles;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className={cn("h-4 w-4", accent)} aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

function ResultView({ result }: { result: ResearchResult }) {
  const meta = result.metadata ?? {};
  const confidence = result.confidence_score;

  if (meta.unstructured) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <p className="flex items-center gap-2 text-sm text-warning-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            The model returned unstructured text for this run.
          </p>
          <p className="whitespace-pre-wrap text-sm">{result.content}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-7 p-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {meta.provider ? (
              <Badge className="bg-purple-500/15 text-purple-300">
                {meta.provider} · {meta.model}
              </Badge>
            ) : null}
            {meta.depth ? <Badge className="capitalize">{meta.depth}</Badge> : null}
            {confidence !== null ? (
              <Badge
                className={cn(
                  confidence >= 0.7
                    ? "bg-success-500/15 text-success-300"
                    : confidence >= 0.4
                      ? "bg-warning-500/15 text-warning-300"
                      : "bg-error-500/15 text-error-300",
                )}
              >
                {Math.round(confidence * 100)}% confidence
              </Badge>
            ) : null}
            {result.token_usage ? (
              <span className="text-xs text-muted-foreground">
                {result.token_usage.toLocaleString()} tokens
              </span>
            ) : null}
          </div>
          {result.title ? (
            <h2 className="font-display text-xl font-bold">{result.title}</h2>
          ) : null}
        </header>

        {result.summary ? (
          <Section icon={Sparkles} title="Summary">
            <p className="text-sm leading-relaxed">{result.summary}</p>
          </Section>
        ) : null}

        {meta.key_points?.length ? (
          <Section icon={Lightbulb} title="Key points">
            <BulletList items={meta.key_points} />
          </Section>
        ) : null}

        {meta.statistics?.length ? (
          <Section icon={TrendingUp} title="Statistics" accent="text-cyan-400">
            <div className="flex flex-col gap-2">
              {meta.statistics.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded border border-border/60 p-3"
                >
                  <span className="font-display text-lg font-bold text-cyan-300">{s.value}</span>
                  <span className="text-sm">{s.claim}</span>
                  {s.source ? (
                    <span className="text-xs text-muted-foreground">
                      — {s.source}
                      {s.year ? ` (${s.year})` : ""}
                    </span>
                  ) : null}
                  {s.confidence ? (
                    <Badge className="ml-auto text-[10px] capitalize">{s.confidence}</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {meta.timeline?.length ? (
          <Section icon={Clock} title="Timeline" accent="text-purple-400">
            <ol className="flex flex-col gap-2 border-l border-border pl-4">
              {meta.timeline.map((t, i) => (
                <li key={i} className="text-sm">
                  <span className="font-mono text-xs text-purple-300">{t.date}</span>
                  <span className="ml-2">{t.event}</span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {meta.myths?.length ? (
          <Section icon={Scale} title="Myths vs reality" accent="text-warning-400">
            <div className="flex flex-col gap-2">
              {meta.myths.map((m, i) => (
                <div key={i} className="rounded border border-border/60 p-3 text-sm">
                  <p className="text-muted-foreground line-through">{m.myth}</p>
                  <p className="mt-1">{m.reality}</p>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {meta.expert_opinions?.length ? (
          <Section icon={Quote} title="Expert opinions" accent="text-purple-400">
            <div className="flex flex-col gap-2">
              {meta.expert_opinions.map((e, i) => (
                <blockquote key={i} className="border-l-2 border-purple-500/50 pl-3 text-sm">
                  <p>{e.position}</p>
                  <footer className="mt-1 text-xs text-muted-foreground">— {e.expert}</footer>
                </blockquote>
              ))}
            </div>
          </Section>
        ) : null}

        {meta.case_studies?.length ? (
          <Section icon={BookOpen} title="Case studies">
            <div className="flex flex-col gap-2">
              {meta.case_studies.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-muted-foreground"> — {c.detail}</span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {meta.arguments?.length || meta.counter_arguments?.length ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {meta.arguments?.length ? (
              <Section icon={Scale} title="Arguments" accent="text-success-400">
                <BulletList items={meta.arguments} />
              </Section>
            ) : null}
            {meta.counter_arguments?.length ? (
              <Section icon={Scale} title="Counter arguments" accent="text-error-400">
                <BulletList items={meta.counter_arguments} />
              </Section>
            ) : null}
          </div>
        ) : null}

        {meta.discussion_ideas?.length ? (
          <Section icon={Lightbulb} title="Discussion ideas" accent="text-cyan-400">
            <BulletList items={meta.discussion_ideas} />
          </Section>
        ) : null}

        {meta.uncertainties?.length ? (
          <Section icon={AlertTriangle} title="Uncertainties" accent="text-warning-400">
            <BulletList items={meta.uncertainties} />
          </Section>
        ) : null}

        {result.sources.length ? (
          <Section icon={BookOpen} title={`Sources (${result.sources.length})`}>
            <ul className="flex flex-col gap-2">
              {result.sources.map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  {s.credibility_score !== null ? (
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        s.credibility_score >= 0.8
                          ? "bg-success-500"
                          : s.credibility_score >= 0.5
                            ? "bg-warning-500"
                            : "bg-error-500",
                      )}
                    />
                  ) : null}
                  <span>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
                      >
                        {s.title ?? s.url}
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : (
                      <span>{s.title}</span>
                    )}
                    {s.author ? (
                      <span className="text-muted-foreground"> — {s.author}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {meta.related_topics?.length ? (
          <Section icon={Search} title="Related topics">
            <div className="flex flex-wrap gap-2">
              {meta.related_topics.map((t, i) => (
                <Badge key={i}>{t}</Badge>
              ))}
            </div>
          </Section>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- page */

export function ResearchWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState(true);
  const [sessions, setSessions] = React.useState<ResearchSession[]>([]);
  const [detail, setDetail] = React.useState<ResearchSessionDetail | null>(null);
  const [running, setRunning] = React.useState(false);
  const [depth, setDepth] = React.useState<ResearchDepth>("standard");
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);

  const loadSessions = React.useCallback(async () => {
    try {
      const page = await researchApi.list({ limit: 25 });
      setSessions(page.items);
      return page.items;
    } catch {
      // History is secondary; the run form stays usable regardless.
      return [];
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const page = await projectsApi.list({ limit: 100 }, controller.signal);
        setProjects(page.items.filter((p) => !p.is_archived));
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setProjectsLoading(false);
      }
      try {
        setAiStatus(await aiApi.status(controller.signal));
      } catch {
        // Provider list is advisory; Auto routing still works without it.
      }
      const existing = await loadSessions();
      // Reopen the most recent session so returning to the page (or a
      // refresh) shows the last briefing instead of an empty form.
      const latest = existing[0];
      if (latest) {
        try {
          setDetail(await researchApi.get(latest.id, controller.signal));
        } catch {
          // Non-fatal: the form is still usable without the last result.
        }
      }
    })();
    return () => controller.abort();
  }, [loadSessions]);

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project_id = String(form.get("project_id") ?? "");
    const topic = String(form.get("topic") ?? "").trim();
    const objective = String(form.get("objective") ?? "").trim();
    const provider = String(form.get("provider") ?? "");

    if (!project_id) {
      setError("Choose a project first.");
      return;
    }
    if (topic.length < 3) {
      setError("Describe the topic you want researched.");
      return;
    }

    setRunning(true);
    setError(null);
    setDetail(null);
    try {
      const session = await researchApi.create({
        project_id,
        topic,
        depth,
        ...(objective ? { objective } : {}),
        ...(provider ? { provider: provider as "openai" | "anthropic" | "google" } : {}),
      });
      const full = await researchApi.get(session.id);
      setDetail(full);
      await loadSessions();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "INSUFFICIENT_CREDITS"
            ? "You are out of AI credits for this month."
            : err.code === "AI_UNAVAILABLE"
              ? // The server names the actual cause (no key configured, key
                // rejected, provider down). Showing our own guess instead
                // hides the one detail that makes this fixable.
                `Research could not run — ${err.message}`
              : err.message,
        );
      } else {
        setError("Research failed. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const openSession = async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      setDetail(await researchApi.get(id));
    } catch {
      setError("Could not open that research session.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const removeSession = async (id: string) => {
    if (!window.confirm("Delete this research session?")) return;
    const snapshot = sessions;
    setSessions((all) => all.filter((s) => s.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await researchApi.remove(id);
    } catch {
      setSessions(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Search}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to start researching."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Run form + result */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={run} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project_id">Project</Label>
                  {projectsLoading ? (
                    <Skeleton className="h-10 rounded" />
                  ) : (
                    <Select id="project_id" name="project_id" required defaultValue="">
                      <option value="" disabled>
                        {projects.length ? "Choose a project" : "No projects yet"}
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
                  <Label htmlFor="depth">Depth</Label>
                  <Select
                    id="depth"
                    name="depth"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value as ResearchDepth)}
                  >
                    {RESEARCH_DEPTHS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {RESEARCH_DEPTHS.find((d) => d.value === depth)?.hint}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="provider">AI provider</Label>
                  <Select id="provider" name="provider" defaultValue="">
                    <option value="">Auto — best model for research</option>
                    {(aiStatus?.providers ?? []).map((p) => (
                      <option key={p.slug} value={p.slug} disabled={!p.configured}>
                        {PROVIDER_LABELS[p.slug] ?? p.slug}
                        {p.configured ? "" : " — no API key"}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Auto follows the documented routing rules. Choosing a provider puts it
                    first; PodMind still falls back to the others if it fails.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="The economics of the attention economy"
                    maxLength={500}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="objective">Objective (optional)</Label>
                  <Textarea
                    id="objective"
                    name="objective"
                    rows={2}
                    maxLength={2000}
                    placeholder="What should this episode achieve for your listeners?"
                  />
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={running} disabled={projects.length === 0}>
                  <Sparkles className="h-4 w-4" />
                  Run research
                </Button>
                <span className="text-xs text-muted-foreground">Uses 10 AI credits</span>
              </div>
            </form>
          </CardContent>
        </Card>

        {running ? <ResearchProgress depth={depth} /> : null}
        {loadingDetail ? <Skeleton className="h-64 rounded-lg" /> : null}

        {detail && !running ? (
          <Appear className="flex flex-col gap-4">
            <Item>
              <div className="flex items-center justify-end">
                <ExportMenu kind="research" id={detail.id} />
              </div>
            </Item>
            {detail.results.map((result) => (
              <Item key={result.id}>
                <ResultView result={result} />
              </Item>
            ))}

            {detail.questions.length ? (
              <Item>
                <Card>
                  <CardContent className="flex flex-col gap-3 p-6">
                    <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <MessageCircleQuestion className="h-4 w-4 text-purple-400" aria-hidden />
                      Questions to ask your guest
                    </h3>
                    <ul className="flex list-decimal flex-col gap-2 pl-5 text-sm">
                      {detail.questions.map((q) => (
                        <li key={q.id}>{q.question}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Item>
            ) : null}
          </Appear>
        ) : null}

        {!detail && !running && !loadingDetail && projects.length === 0 && !projectsLoading ? (
          <EmptyState
            icon={Search}
            title="Create a project first"
            description="Research is always attached to a project so it inherits your show's context — podcast name, audience and niche."
          />
        ) : null}
      </div>

      {/* History */}
      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent research
        </h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your sessions will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === s.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void openSession(s.id)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="capitalize">{s.depth}</span>
                      <span aria-hidden>·</span>
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete research: ${s.title}`}
                    onClick={() => void removeSession(s.id)}
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
