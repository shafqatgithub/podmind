"use client";

/**
 * SEO workspace.
 *
 * Everything here ends up pasted into YouTube, Spotify or a CMS, so the page
 * is built around copying: each field has its own copy button and shows its
 * character count against the limit that actually matters for that field.
 * Scores are labelled as the model's judgement, not measured data, because
 * presenting an opinion as a metric is how people end up trusting a number
 * that was never real.
 */

import * as React from "react";
import {
  Check,
  Copy,
  Hash,
  Image as ImageIcon,
  ListOrdered,
  MousePointerClick,
  Search,
  Sparkles,
  Tag,
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
import { scriptsApi, type Script } from "@/lib/api/scripts";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import { seoApi, type SeoSet, type SeoSetDetail } from "@/lib/api/seo";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

/** Limits that matter when the text is pasted into a real platform. */
const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      className="shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit;
  return (
    <span className={cn("font-mono text-xs", over ? "text-warning-400" : "text-muted-foreground")}>
      {value.length}/{limit}
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  accent = "text-primary-400",
}: {
  icon: typeof Search;
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

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SeoResult({
  set,
  onSelect,
}: {
  set: SeoSetDetail;
  onSelect: (body: { title_id?: string; description_id?: string }) => Promise<void>;
}) {
  const meta = set.metadata ?? {};
  const [busy, setBusy] = React.useState(false);

  const pick = async (body: { title_id?: string; description_id?: string }) => {
    setBusy(true);
    try {
      await onSelect(body);
    } finally {
      setBusy(false);
    }
  };

  const allTags = set.tags.map((t) => t.tag).join(", ");
  const allHashtags = set.hashtags.map((h) => h.hashtag).join(" ");
  const chapterBlock = set.chapters
    .map((c) => `${formatTimestamp(c.timestamp_seconds)} ${c.title}`)
    .join("\n");

  return (
    <Card>
      <CardContent className="flex flex-col gap-7 p-6">
        <header className="flex flex-wrap items-center gap-2">
          {meta.provider ? (
            <Badge className="bg-purple-500/15 text-purple-300">
              {PROVIDER_LABELS[meta.provider] ?? meta.provider}
            </Badge>
          ) : null}
          {set.target_keyword ? (
            <Badge className="bg-cyan-500/15 text-cyan-300">{set.target_keyword}</Badge>
          ) : null}
          {set.search_intent ? <Badge className="capitalize">{set.search_intent}</Badge> : null}
        </header>

        <Section icon={Search} title={`Titles (${set.titles.length})`}>
          <p className="-mt-1 text-xs text-muted-foreground">
            Scores are the model&apos;s judgement of search fit and click appeal — not measured
            data. Pick the one that is true to your episode.
          </p>
          <ul className="flex flex-col gap-2">
            {set.titles.map((t) => (
              <li key={t.id}>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded border p-3 transition-colors",
                    t.selected
                      ? "border-primary-500/60 bg-primary-500/5"
                      : "border-border/60 hover:border-primary-500/30",
                  )}
                >
                  <button
                    type="button"
                    disabled={busy || t.selected}
                    onClick={() => void pick({ title_id: t.id })}
                    aria-pressed={t.selected}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
                  >
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2">
                      <CharCount value={t.title} limit={TITLE_LIMIT} />
                      {t.seo_score !== null ? (
                        <span className="text-xs text-muted-foreground">SEO {t.seo_score}</span>
                      ) : null}
                      {t.click_score !== null ? (
                        <span className="text-xs text-muted-foreground">Click {t.click_score}</span>
                      ) : null}
                      {t.selected ? (
                        <Badge className="bg-primary-500/15 text-primary-300">Selected</Badge>
                      ) : null}
                    </p>
                  </button>
                  <CopyButton value={t.title} label="title" />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={Search} title="Descriptions" accent="text-cyan-400">
          <ul className="flex flex-col gap-2">
            {set.descriptions.map((d) => (
              <li key={d.id}>
                <div
                  className={cn(
                    "flex items-start gap-2 rounded border p-3 transition-colors",
                    d.selected
                      ? "border-primary-500/60 bg-primary-500/5"
                      : "border-border/60 hover:border-primary-500/30",
                  )}
                >
                  <button
                    type="button"
                    disabled={busy || d.selected}
                    onClick={() => void pick({ description_id: d.id })}
                    aria-pressed={d.selected}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default"
                  >
                    <p className="text-sm">{d.description}</p>
                    <p className="mt-1 flex items-center gap-2">
                      <CharCount value={d.description} limit={DESCRIPTION_LIMIT} />
                      {d.selected ? (
                        <Badge className="bg-primary-500/15 text-primary-300">Selected</Badge>
                      ) : null}
                    </p>
                  </button>
                  <CopyButton value={d.description} label="description" />
                </div>
              </li>
            ))}
          </ul>
        </Section>

        {set.keywords.length ? (
          <Section icon={Tag} title="Keywords" accent="text-purple-400">
            <div className="flex flex-col gap-1.5">
              {set.keywords.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{k.keyword}</span>
                  {k.intent ? (
                    <Badge className="text-[10px] capitalize">{k.intent}</Badge>
                  ) : null}
                  {k.priority ? (
                    <span className="text-xs text-muted-foreground">priority {k.priority}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {set.tags.length ? (
          <Section icon={Tag} title="Tags">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-wrap gap-1.5">
                {set.tags.map((t) => (
                  <Badge key={t.id}>{t.tag}</Badge>
                ))}
              </div>
              <CopyButton value={allTags} label="all tags" />
            </div>
          </Section>
        ) : null}

        {set.hashtags.length ? (
          <Section icon={Hash} title="Hashtags" accent="text-cyan-400">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-wrap gap-1.5">
                {set.hashtags.map((h) => (
                  <Badge key={h.id} className="bg-cyan-500/10 text-cyan-300">
                    {h.hashtag}
                  </Badge>
                ))}
              </div>
              <CopyButton value={allHashtags} label="all hashtags" />
            </div>
          </Section>
        ) : null}

        {set.chapters.length ? (
          <Section icon={ListOrdered} title="Chapters" accent="text-purple-400">
            <div className="flex items-start gap-2">
              <ol className="flex flex-1 flex-col gap-1 font-mono text-sm">
                {set.chapters.map((c) => (
                  <li key={c.id}>
                    <span className="text-purple-300">{formatTimestamp(c.timestamp_seconds)}</span>
                    <span className="ml-3 font-sans">{c.title}</span>
                  </li>
                ))}
              </ol>
              <CopyButton value={chapterBlock} label="chapters" />
            </div>
          </Section>
        ) : null}

        {meta.thumbnail_ideas?.length ? (
          <Section icon={ImageIcon} title="Thumbnail ideas" accent="text-warning-400">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.thumbnail_ideas.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {meta.ctr_suggestions?.length ? (
          <Section icon={MousePointerClick} title="Click-through suggestions" accent="text-success-400">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.ctr_suggestions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Section>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SeoWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [sets, setSets] = React.useState<SeoSet[]>([]);
  const [detail, setDetail] = React.useState<SeoSetDetail | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadSets = React.useCallback(async () => {
    try {
      setSets((await seoApi.list()).items);
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
        setAiStatus(await aiApi.status(controller.signal));
      } catch {
        /* selector stays on Auto */
      }
      await loadSets();
    })();
    return () => controller.abort();
  }, [loadSets]);

  React.useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        setScripts((await scriptsApi.list(projectId, controller.signal)).items);
      } catch {
        setScripts([]);
      }
    })();
    return () => controller.abort();
  }, [projectId]);

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    setRunning(true);
    setError(null);
    setDetail(null);
    try {
      const scriptId = String(form.get("script_id") ?? "");
      const result = await seoApi.create({
        project_id: projectId,
        ...(scriptId ? { script_id: scriptId } : {}),
        ...(String(form.get("topic") ?? "").trim()
          ? { topic: String(form.get("topic")).trim() }
          : {}),
        ...(String(form.get("target_keyword") ?? "").trim()
          ? { target_keyword: String(form.get("target_keyword")).trim() }
          : {}),
        ...(String(form.get("provider") ?? "")
          ? { provider: String(form.get("provider")) as "openai" | "anthropic" | "google" }
          : {}),
      });
      setDetail(result);
      await loadSets();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "INSUFFICIENT_CREDITS"
            ? "You are out of AI credits."
            : err.code === "AI_UNAVAILABLE"
              ? "No AI provider is configured on the backend yet."
              : err.message,
        );
      } else {
        setError("Could not generate SEO metadata. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const select = async (body: { title_id?: string; description_id?: string }) => {
    if (!detail) return;
    setDetail(await seoApi.select(detail.id, body));
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this SEO set?")) return;
    const snapshot = sets;
    setSets((all) => all.filter((s) => s.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await seoApi.remove(id);
    } catch {
      setSets(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Search}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to generate SEO metadata."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
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
                  <Label htmlFor="script_id">Script (optional)</Label>
                  <Select id="script_id" name="script_id" defaultValue="">
                    <option value="">Use the topic only</option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="topic">Episode topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    maxLength={500}
                    placeholder="Leave blank to use the project title"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="target_keyword">Preferred keyword (optional)</Label>
                  <Input id="target_keyword" name="target_keyword" maxLength={200} />
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
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={running} disabled={projects.length === 0}>
                  <Sparkles className="h-4 w-4" />
                  Generate SEO
                </Button>
                <span className="text-xs text-muted-foreground">Uses 3 AI credits</span>
              </div>
            </form>
          </CardContent>
        </Card>

        {running ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Sparkles className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
              <p className="text-sm">Writing titles, descriptions and keywords…</p>
            </CardContent>
          </Card>
        ) : null}

        {detail && !running ? (
          <Appear>
            <SeoResult set={detail} onSelect={select} />
          </Appear>
        ) : null}

        {!detail && !running && !loading && projects.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Create a project first"
            description="SEO metadata is attached to a project so it can describe a real episode."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent SEO sets
        </h2>
        {sets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your SEO sets will appear here.</p>
        ) : (
          <Reveal className="flex flex-col gap-2">
            {sets.map((s) => (
              <Item key={s.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === s.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void seoApi.get(s.id).then(setDetail)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    {s.target_keyword ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {s.target_keyword}
                      </p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete SEO set: ${s.title}`}
                    onClick={() => void remove(s.id)}
                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-error-400 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Item>
            ))}
          </Reveal>
        )}
      </aside>
    </div>
  );
}
