"use client";

/**
 * Social workspace.
 *
 * Each post is shown as its own card with a live character count against that
 * platform's real limit, because the whole value of the module is that the
 * posts differ per network — presenting them in one merged blob would hide
 * exactly what the user is paying for.
 */

import * as React from "react";
import {
  Check,
  Copy,
  Images,
  ListOrdered,
  Share2,
  Smile,
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
import { scriptsApi, type Script } from "@/lib/api/scripts";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import {
  socialApi,
  SOCIAL_PLATFORMS,
  TONES,
  type SocialCampaign,
  type SocialCampaignDetail,
  type SocialPlatform,
  type SocialPost,
} from "@/lib/api/social";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

const PLATFORM_META: Record<SocialPlatform, { label: string; limit: number; accent: string }> =
  Object.fromEntries(
    SOCIAL_PLATFORMS.map((p) => [
      p.value,
      {
        label: p.label,
        limit: p.limit,
        accent:
          p.value === "linkedin"
            ? "text-primary-300"
            : p.value === "x"
              ? "text-foreground"
              : p.value === "instagram"
                ? "text-purple-300"
                : p.value === "youtube"
                  ? "text-error-300"
                  : "text-cyan-300",
      },
    ]),
  ) as Record<SocialPlatform, { label: string; limit: number; accent: string }>;

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-success-400" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy
        </>
      )}
    </Button>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const meta = PLATFORM_META[post.platform];
  const count = post.character_count ?? post.content.length;
  const near = count > meta.limit * 0.9;

  const full = [post.title, post.content, post.hashtags.join(" ")]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-display text-sm font-semibold", meta.accent)}>
            {meta.label}
          </span>
          <span
            className={cn(
              "font-mono text-xs",
              near ? "text-warning-400" : "text-muted-foreground",
            )}
          >
            {count}/{meta.limit}
          </span>
          <div className="ml-auto">
            <CopyButton value={full} label={`${meta.label} post`} />
          </div>
        </div>

        {post.title ? <p className="font-semibold">{post.title}</p> : null}

        <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

        {post.hashtags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {post.hashtags.map((h, i) => (
              <Badge key={i} className="bg-cyan-500/10 text-cyan-300">
                {h}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function SocialWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [campaigns, setCampaigns] = React.useState<SocialCampaign[]>([]);
  const [detail, setDetail] = React.useState<SocialCampaignDetail | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [platforms, setPlatforms] = React.useState<SocialPlatform[]>(["linkedin", "x"]);
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadCampaigns = React.useCallback(async () => {
    try {
      setCampaigns((await socialApi.list()).items);
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
      await loadCampaigns();
    })();
    return () => controller.abort();
  }, [loadCampaigns]);

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

  const togglePlatform = (value: SocialPlatform) => {
    setPlatforms((all) =>
      all.includes(value) ? all.filter((p) => p !== value) : [...all, value],
    );
  };

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    if (platforms.length === 0) {
      setError("Pick at least one platform.");
      return;
    }

    setRunning(true);
    setError(null);
    setDetail(null);
    try {
      const scriptId = String(form.get("script_id") ?? "");
      const result = await socialApi.create({
        project_id: projectId,
        platforms,
        tone: String(form.get("tone") ?? "friendly") as (typeof TONES)[number],
        ...(scriptId ? { script_id: scriptId } : {}),
        ...(String(form.get("topic") ?? "").trim()
          ? { topic: String(form.get("topic")).trim() }
          : {}),
        ...(String(form.get("provider") ?? "")
          ? { provider: String(form.get("provider")) as "openai" | "anthropic" | "google" }
          : {}),
      });
      setDetail(result);
      await loadCampaigns();
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
        setError("Could not write the posts. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this campaign?")) return;
    const snapshot = campaigns;
    setCampaigns((all) => all.filter((c) => c.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await socialApi.remove(id);
    } catch {
      setCampaigns(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Share2}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to write social posts."
      />
    );
  }

  const meta = detail?.metadata ?? {};

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
                  <Label htmlFor="tone">Tone</Label>
                  <Select id="tone" name="tone" defaultValue="friendly">
                    {TONES.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t}
                      </option>
                    ))}
                  </Select>
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

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Platforms</legend>
                <div className="flex flex-wrap gap-2">
                  {SOCIAL_PLATFORMS.map((p) => {
                    const on = platforms.includes(p.value);
                    return (
                      <Button
                        key={p.value}
                        type="button"
                        size="sm"
                        variant={on ? "primary" : "secondary"}
                        aria-pressed={on}
                        onClick={() => togglePlatform(p.value)}
                      >
                        {p.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Each platform is written on its own terms — different length, rhythm and framing,
                  not one post reworded.
                </p>
              </fieldset>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={running} disabled={projects.length === 0}>
                  <Sparkles className="h-4 w-4" />
                  Write posts
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
              <p className="text-sm">Writing for {platforms.length} platforms…</p>
            </CardContent>
          </Card>
        ) : null}

        {detail && !running ? (
          <Appear>
            <div className="flex flex-col gap-4">
              <Reveal className="flex flex-col gap-4">
                {detail.posts.map((post) => (
                  <Item key={post.id}>
                    <PostCard post={post} />
                  </Item>
                ))}
              </Reveal>

              {meta.thread?.length ? (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-primary-400" aria-hidden />
                      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        X thread
                      </h3>
                      <div className="ml-auto">
                        <CopyButton value={meta.thread.join("\n\n")} label="thread" />
                      </div>
                    </div>
                    <ol className="flex flex-col gap-2">
                      {meta.thread.map((t, i) => (
                        <li key={i} className="rounded border border-border/60 p-3 text-sm">
                          {t}
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ) : null}

              {meta.carousel_ideas?.length ? (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-5">
                    <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <Images className="h-4 w-4 text-purple-400" aria-hidden />
                      Carousel ideas
                    </h3>
                    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                      {meta.carousel_ideas.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              ) : null}

              {meta.emoji_notes?.length ? (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-5">
                    <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <Smile className="h-4 w-4 text-warning-400" aria-hidden />
                      Emoji notes
                    </h3>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                      {meta.emoji_notes.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </Appear>
        ) : null}

        {!detail && !running && !loading && projects.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Create a project first"
            description="Social posts are attached to a project so they promote a real episode."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent campaigns
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your campaigns will appear here.</p>
        ) : (
          <Reveal className="flex flex-col gap-2">
            {campaigns.map((c) => (
              <Item key={c.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === c.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void socialApi.get(c.id).then(setDetail)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.post_count ?? 0} post{Number(c.post_count) === 1 ? "" : "s"}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete campaign: ${c.title}`}
                    onClick={() => void remove(c.id)}
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
