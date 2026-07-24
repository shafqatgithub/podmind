"use client";

/**
 * Topic discovery.
 *
 * Every topic here is a claim about what is happening now, so every topic
 * shows what it is based on. Sources are not hidden behind an expander:
 * the whole point of this feature over asking a chatbot is that the answer
 * is checkable, and a source nobody sees is a source nobody checks.
 */

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Compass,
  ExternalLink,
  Lightbulb,
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
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import {
  topicsApi,
  type Discovery,
  type DiscoverySummary,
  type DiscoveredTopic,
  type Momentum,
} from "@/lib/api/topics";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

const MOMENTUM_STYLE: Record<Momentum, { label: string; className: string }> = {
  rising: { label: "Rising", className: "bg-success-500/15 text-success-300" },
  peaking: { label: "Peaking", className: "bg-primary-500/15 text-primary-300" },
  steady: { label: "Steady", className: "bg-neutral-500/15 text-neutral-300" },
  fading: { label: "Fading", className: "bg-warning-500/15 text-warning-300" },
};

function TopicCard({
  topic,
  projectId,
  onToggleSave,
}: {
  topic: DiscoveredTopic;
  projectId: string;
  onToggleSave: (t: DiscoveredTopic) => void;
}) {
  const sources = topic.sources ?? [];
  const momentum = topic.momentum ? MOMENTUM_STYLE[topic.momentum] : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            {momentum ? (
              <Badge className={momentum.className}>
                <TrendingUp className="mr-1 h-3 w-3" aria-hidden />
                {momentum.label}
              </Badge>
            ) : null}
          </div>
          <h3 className="font-display font-semibold leading-tight">{topic.title}</h3>
        </div>
        <button
          type="button"
          aria-label={topic.is_saved ? "Remove from saved" : "Save topic"}
          aria-pressed={topic.is_saved}
          onClick={() => onToggleSave(topic)}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Bookmark
            className={cn("h-4 w-4", topic.is_saved && "fill-primary-400 text-primary-400")}
          />
        </button>
      </div>

      {topic.angle ? <p className="text-sm">{topic.angle}</p> : null}

      <div className="flex flex-col gap-2 text-sm">
        {topic.why_now ? (
          <p>
            <span className="font-medium text-primary-300">Why now — </span>
            <span className="text-muted-foreground">{topic.why_now}</span>
          </p>
        ) : null}
        {topic.audience_fit ? (
          <p>
            <span className="font-medium text-cyan-300">Your audience — </span>
            <span className="text-muted-foreground">{topic.audience_fit}</span>
          </p>
        ) : null}
      </div>

      {/* Always visible, never behind an expander. */}
      {sources.length ? (
        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Based on
          </p>
          <ul className="flex flex-col gap-1 text-xs">
            {sources.map((source, i) => (
              <li key={i}>
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-primary-400 hover:text-primary-300"
                  >
                    <span>{source.title ?? source.url}</span>
                    <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  </a>
                ) : (
                  <span className="text-muted-foreground">{source.title}</span>
                )}
                {source.publisher ? (
                  <span className="text-muted-foreground"> — {source.publisher}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button asChild size="sm" variant="secondary">
          <Link
            href={`/agents?topic=${encodeURIComponent(topic.title)}&project=${projectId}`}
          >
            <Sparkles className="h-4 w-4" />
            Make this episode
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/guests?topic=${encodeURIComponent(topic.title)}&project=${projectId}`}>
            Find guests
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function TopicsWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [history, setHistory] = React.useState<DiscoverySummary[]>([]);
  const [discovery, setDiscovery] = React.useState<Discovery | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [searchAvailable, setSearchAvailable] = React.useState<boolean | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadHistory = React.useCallback(async () => {
    try {
      setHistory((await topicsApi.list()).items);
    } catch {
      /* history is secondary */
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const page = await projectsApi.list({ limit: 100 }, controller.signal);
        const active = page.items.filter((p) => !p.is_archived);
        setProjects(active);
        if (active[0]) setProjectId(active[0].id);
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
      try {
        setSearchAvailable((await topicsApi.status(controller.signal)).search_available);
      } catch {
        setSearchAvailable(null);
      }
      try {
        setAiStatus(await aiApi.status(controller.signal));
      } catch {
        /* selector stays on Auto */
      }
      await loadHistory();
    })();
    return () => controller.abort();
  }, [loadHistory]);

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const niche = String(form.get("niche") ?? "").trim();

    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    if (niche.length < 2) {
      setError("What is your podcast about?");
      return;
    }

    setRunning(true);
    setError(null);
    setDiscovery(null);
    try {
      const result = await topicsApi.discover({
        project_id: projectId,
        niche,
        ...(String(form.get("audience") ?? "").trim()
          ? { audience: String(form.get("audience")).trim() }
          : {}),
        ...(String(form.get("country") ?? "").trim()
          ? { country: String(form.get("country")).trim() }
          : {}),
        ...(String(form.get("provider") ?? "")
          ? { provider: String(form.get("provider")) as "openai" | "anthropic" | "google" }
          : {}),
      });
      setDiscovery(result);
      await loadHistory();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "SEARCH_UNAVAILABLE"
            ? "Topic discovery needs a provider with web search. Add an Anthropic API key to enable it."
            : err.code === "NO_SOURCED_TOPICS"
              ? "Nothing came back with a source behind it. Try a broader description, or run it again."
              : err.code === "INSUFFICIENT_CREDITS"
                ? "You are out of AI credits."
                : err.message,
        );
      } else {
        setError("Discovery failed. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const toggleSave = async (topic: DiscoveredTopic) => {
    const next = !topic.is_saved;
    setDiscovery((current) =>
      current
        ? {
            ...current,
            topics: current.topics.map((t) =>
              t.id === topic.id ? { ...t, is_saved: next } : t,
            ),
          }
        : current,
    );
    try {
      await topicsApi.setSaved(topic.id, next);
    } catch {
      setDiscovery((current) =>
        current
          ? {
              ...current,
              topics: current.topics.map((t) =>
                t.id === topic.id ? { ...t, is_saved: !next } : t,
              ),
            }
          : current,
      );
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Compass}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to discover topics."
      />
    );
  }

  const meta = discovery?.metadata ?? {};

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {searchAvailable === false ? (
          <Card className="border-warning-500/40">
            <CardContent className="flex items-start gap-3 p-5">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-400" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">Web search is not available</p>
                <p className="mt-1 text-muted-foreground">
                  Discovery reads the live web rather than guessing from memory, so it needs a
                  provider that can search — currently Anthropic. Add that key to the backend
                  and this page will work.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="p-6">
            <form onSubmit={run} className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="project_id">Project</Label>
                  {loading ? (
                    <Skeleton className="h-10 rounded" />
                  ) : (
                    <Select
                      id="project_id"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      required
                    >
                      {projects.length === 0 ? <option value="">No projects yet</option> : null}
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="provider">AI provider</Label>
                  <Select id="provider" name="provider" defaultValue="">
                    <option value="">Auto</option>
                    {(aiStatus?.providers ?? []).map((p) => (
                      <option key={p.slug} value={p.slug} disabled={!p.configured}>
                        {PROVIDER_LABELS[p.slug] ?? p.slug}
                        {p.configured ? "" : " (no key)"}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="niche">Your niche or expertise</Label>
                  <Input
                    id="niche"
                    name="niche"
                    placeholder="Productivity and focus for knowledge workers"
                    maxLength={300}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="audience">Audience (optional)</Label>
                  <Input id="audience" name="audience" maxLength={500} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="country">Country (optional)</Label>
                  <Input
                    id="country"
                    name="country"
                    maxLength={100}
                    placeholder="Pakistan"
                  />
                  <p className="text-xs text-muted-foreground">
                    Prefers stories and sources that matter there.
                  </p>
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  loading={running}
                  disabled={projects.length === 0 || searchAvailable === false}
                >
                  <Compass className="h-4 w-4" />
                  Find topics
                </Button>
                <span className="text-xs text-muted-foreground">
                  10 credits · searches the live web
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        {running ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Search className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
              <p className="text-sm">
                Searching the web for what is moving in your niche…
                <span className="ml-2 text-muted-foreground">Usually 30–90 seconds.</span>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {discovery && !running ? (
          <Appear>
            <div className="flex flex-col gap-4">
              {meta.summary ? (
                <Card>
                  <CardContent className="flex flex-col gap-2 p-5">
                    <h2 className="font-display font-semibold">What is moving right now</h2>
                    <p className="text-sm text-muted-foreground">{meta.summary}</p>
                    {meta.dropped_unsourced ? (
                      <p className="text-xs text-muted-foreground/70">
                        {meta.dropped_unsourced} suggestion
                        {meta.dropped_unsourced === 1 ? "" : "s"} dropped for having no source.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <Reveal className="flex flex-col gap-3">
                {discovery.topics.map((topic) => (
                  <Item key={topic.id}>
                    <TopicCard
                      topic={topic}
                      projectId={discovery.project_id}
                      onToggleSave={toggleSave}
                    />
                  </Item>
                ))}
              </Reveal>

              {meta.gaps?.length || meta.avoid?.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {meta.gaps?.length ? (
                    <Card>
                      <CardContent className="flex flex-col gap-2 p-5">
                        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                          <Lightbulb className="h-4 w-4 text-cyan-400" aria-hidden />
                          Nobody is covering
                        </h3>
                        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                          {meta.gaps.map((gap, i) => (
                            <li key={i}>{gap}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : null}
                  {meta.avoid?.length ? (
                    <Card>
                      <CardContent className="flex flex-col gap-2 p-5">
                        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                          <AlertTriangle className="h-4 w-4 text-warning-400" aria-hidden />
                          Already saturated
                        </h3>
                        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                          {meta.avoid.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Appear>
        ) : null}

        {!discovery && !running && !loading && projects.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="Create a project first"
            description="Topics belong to a project so the pipeline can pick one up and run with it."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Past searches
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your searches will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    discovery?.id === h.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      void topicsApi.get(h.id).then(setDiscovery).catch(() => undefined);
                    }}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{h.niche}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {h.topic_count} topic{h.topic_count === 1 ? "" : "s"} ·{" "}
                      {new Date(h.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete search: ${h.niche}`}
                    onClick={() => {
                      setHistory((all) => all.filter((x) => x.id !== h.id));
                      if (discovery?.id === h.id) setDiscovery(null);
                      void topicsApi.remove(h.id).catch(() => void loadHistory());
                    }}
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
