"use client";

/**
 * Script Builder — 11-Feature-Specifications MODULE 7.
 *
 * The script is the deliverable a host actually reads from, so the view
 * favours legibility: generous line height, speaker labels set apart, and
 * production notes visually separated from spoken words.
 */

import * as React from "react";
import {
  AlertTriangle,
  CheckCheck,
  Clock,
  Copy,
  FileText,
  Gauge,
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
import { outlinesApi, type Outline } from "@/lib/api/outlines";
import {
  SCRIPT_STYLES,
  SCRIPT_TONES,
  scriptsApi,
  type Script,
  type ScriptDetail,
  type ScriptStyle,
  type ScriptTone,
} from "@/lib/api/scripts";
import { EmptyState } from "@/components/common/empty-state";
import { ExportMenu } from "@/components/common/export-menu";
import { Appear, Item } from "@/components/motion/motion";

function readabilityLabel(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Easy to say aloud", className: "bg-success-500/15 text-success-300" };
  if (score >= 50) return { label: "Moderate", className: "bg-primary-500/15 text-primary-300" };
  return { label: "Dense — consider simplifying", className: "bg-warning-500/15 text-warning-300" };
}

function ScriptView({ script }: { script: ScriptDetail }) {
  const meta = script.metadata ?? {};
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script.content ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text stays selectable on screen.
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize">{script.script_style}</Badge>
            <Badge className="capitalize">{script.tone}</Badge>
            {script.estimated_duration_minutes ? (
              <Badge className="bg-cyan-500/15 text-cyan-300">
                <Clock className="mr-1 h-3 w-3" aria-hidden />
                {script.estimated_duration_minutes} min
              </Badge>
            ) : null}
            {script.word_count ? (
              <span className="text-xs text-muted-foreground">
                {script.word_count.toLocaleString()} words
              </span>
            ) : null}
            {typeof meta.readability === "number" ? (
              <Badge className={cn("text-[10px]", readabilityLabel(meta.readability).className)}>
                <Gauge className="mr-1 h-3 w-3" aria-hidden />
                {readabilityLabel(meta.readability).label}
              </Badge>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => void copy()}>
                {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <ExportMenu kind="scripts" id={script.id} />
            </div>
          </div>

          <h2 className="font-display text-xl font-bold">{script.title}</h2>
          {script.description ? (
            <p className="text-sm text-muted-foreground">{script.description}</p>
          ) : null}
        </header>

        {meta.verify?.length ? (
          <section className="rounded border border-warning-500/40 bg-warning-500/5 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-warning-300">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Verify before recording
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.verify.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* The script itself */}
        <article className="flex flex-col gap-6">
          {script.sections.map((section) => (
            <section key={section.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-2">
                {section.title ? (
                  <h3 className="font-display font-semibold">{section.title}</h3>
                ) : null}
                {section.speaker && section.speaker !== "host" ? (
                  <Badge className="bg-purple-500/15 text-[10px] uppercase text-purple-300">
                    <Mic className="mr-1 h-3 w-3" aria-hidden />
                    {section.speaker}
                  </Badge>
                ) : null}
                {section.duration_seconds ? (
                  <span className="text-xs text-muted-foreground">
                    ~{Math.round(section.duration_seconds / 60)} min
                  </span>
                ) : null}
              </div>

              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {section.content}
              </p>

              {section.notes ? (
                <p className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
                  {section.notes}
                </p>
              ) : null}
            </section>
          ))}
        </article>

        {meta.editing_notes?.length ? (
          <section className="border-t border-border/60 pt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Editing notes
            </h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {meta.editing_notes.map((note, i) => (
                <li key={i}>{note}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ScriptsWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [outlines, setOutlines] = React.useState<Outline[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [detail, setDetail] = React.useState<ScriptDetail | null>(null);
  const [style, setStyle] = React.useState<ScriptStyle>("solo");
  const [tone, setTone] = React.useState<ScriptTone>("friendly");
  const [duration, setDuration] = React.useState(30);
  const [writing, setWriting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadScripts = React.useCallback(async (signal?: AbortSignal) => {
    const page = await scriptsApi.list(undefined, signal);
    setScripts(page.items);
    return page.items;
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [projectPage, outlinePage, items] = await Promise.all([
          projectsApi.list({ limit: 100 }, controller.signal),
          outlinesApi.list(undefined, controller.signal).catch(() => ({ items: [] })),
          loadScripts(controller.signal),
        ]);
        setProjects(projectPage.items.filter((p) => !p.is_archived));
        setOutlines(outlinePage.items as Outline[]);
        const latest = items[0];
        if (latest) setDetail(await scriptsApi.get(latest.id, controller.signal));
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [loadScripts]);

  const write = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project_id = String(form.get("project_id") ?? "");
    const outline_id = String(form.get("outline_id") ?? "");
    const topic = String(form.get("topic") ?? "").trim();
    const guest_name = String(form.get("guest_name") ?? "").trim();

    if (!project_id) {
      setError("Choose a project.");
      return;
    }
    if (!outline_id && topic.length < 3) {
      setError("Pick an outline to write from, or describe the topic.");
      return;
    }

    setWriting(true);
    setError(null);
    setDetail(null);
    try {
      const created = await scriptsApi.create({
        project_id,
        ...(outline_id ? { outline_id } : {}),
        ...(topic ? { topic } : {}),
        style,
        tone,
        duration_minutes: duration,
        ...(guest_name ? { guest_name } : {}),
      });
      setDetail(await scriptsApi.get(created.id));
      await loadScripts();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "INSUFFICIENT_CREDITS"
            ? "You are out of AI credits."
            : err.message
          : "Could not write the script.",
      );
    } finally {
      setWriting(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this script?")) return;
    const snapshot = scripts;
    setScripts((all) => all.filter((s) => s.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await scriptsApi.remove(id);
    } catch {
      setScripts(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={FileText}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to write scripts."
      />
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Create a project first"
        description="Scripts belong to a project, so they inherit your show's voice and audience."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={write} className="flex flex-col gap-5">
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
                  <Label htmlFor="outline_id">Write from outline</Label>
                  <Select id="outline_id" name="outline_id" defaultValue="">
                    <option value="">None — write from a topic</option>
                    {outlines.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    An outline gives the script its running order and timing.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="topic">Topic (if not using an outline)</Label>
                  <Input
                    id="topic"
                    name="topic"
                    maxLength={500}
                    placeholder="Why attention became the product"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="style">Style</Label>
                  <Select
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as ScriptStyle)}
                  >
                    {SCRIPT_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tone">Tone</Label>
                  <Select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ScriptTone)}
                  >
                    {SCRIPT_TONES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="duration">Target length</Label>
                  <Select
                    id="duration"
                    value={String(duration)}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  >
                    {[10, 15, 20, 30, 45, 60].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </Select>
                </div>

                {style === "interview" ? (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="guest_name">Guest name</Label>
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
                <Button type="submit" loading={writing}>
                  <Sparkles className="h-4 w-4" />
                  Write script
                </Button>
                <span className="text-xs text-muted-foreground">
                  Uses 15 AI credits · a full script takes 1–2 minutes
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        {writing ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Sparkles className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
              <div>
                <p className="font-display font-semibold">Writing your script…</p>
                <p className="text-sm text-muted-foreground">
                  A {duration} minute script is roughly {duration * 140} spoken words. This takes
                  a minute or two.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {detail && !writing ? (
          <Appear className="flex flex-col gap-4">
            <Item>
              <ScriptView script={detail} />
            </Item>
          </Appear>
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-64 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Scripts
        </h2>
        {scripts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your scripts will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {scripts.map((s) => (
              <li key={s.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === s.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void scriptsApi.get(s.id).then(setDetail)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.estimated_duration_minutes ? `${s.estimated_duration_minutes}m` : ""}
                      {s.word_count ? ` · ${s.word_count.toLocaleString()} words` : ""}
                      {s.is_current ? " · current" : ""}
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${s.title}`}
                    onClick={() => void remove(s.id)}
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
