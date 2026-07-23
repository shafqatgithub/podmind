"use client";

/**
 * Episode Pipeline — the orchestrator's screen.
 *
 * A run takes minutes and happens on the server, so this polls rather than
 * holding a request open. The design commitment is that a partial result is
 * still a result: every step that finished links to its artifact even when a
 * later one failed, because research that succeeded is worth reading whatever
 * happened to the script afterwards.
 */

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Check,
  Clock,
  Loader2,
  Sparkles,
  Workflow,
  X,
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
import Link from "next/link";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import {
  agentsApi,
  PIPELINE_STEPS,
  type AgentRun,
  type AgentRunSummary,
  type AgentTask,
  type PipelineStep,
} from "@/lib/api/agents";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

const DEFAULT_STEPS: PipelineStep[] = ["research", "outline", "script"];

/** Where a finished step's artifact lives, so the user can go read it. */
const ARTIFACT_LINK: Record<PipelineStep, { key: string; href: string; label: string }> = {
  research: { key: "research_session_id", href: "/research", label: "View research" },
  outline: { key: "outline_id", href: "/outlines", label: "View outline" },
  script: { key: "script_id", href: "/scripts", label: "View script" },
  seo: { key: "seo_id", href: "/seo", label: "View SEO" },
  social: { key: "social_id", href: "/social", label: "View posts" },
};

const STATUS_ICON: Record<AgentTask["status"], typeof Check> = {
  queued: Clock,
  running: Loader2,
  completed: Check,
  failed: X,
  skipped: Ban,
};

const STATUS_STYLE: Record<AgentTask["status"], string> = {
  queued: "text-muted-foreground/60",
  running: "text-primary-400",
  completed: "text-success-400",
  failed: "text-error-400",
  skipped: "text-muted-foreground",
};

function TaskRow({ task }: { task: AgentTask }) {
  const Icon = STATUS_ICON[task.status];
  const artifact = ARTIFACT_LINK[task.task_type];
  const artifactId =
    task.output && typeof task.output[artifact.key] === "string"
      ? (task.output[artifact.key] as string)
      : null;

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 rounded border border-border/60 p-3",
        task.status === "running" && "border-primary-500/40 bg-primary-500/5",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          STATUS_STYLE[task.status],
          task.status === "running" && "animate-spin",
        )}
        aria-hidden
      />
      <span className={cn("text-sm font-medium", task.status === "skipped" && "opacity-60")}>
        {task.task_name}
      </span>

      {task.execution_time_ms ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {(task.execution_time_ms / 1000).toFixed(1)}s
        </span>
      ) : null}

      {task.error_message ? (
        <span className="w-full text-xs text-muted-foreground sm:w-auto">
          {task.error_message}
        </span>
      ) : null}

      {artifactId ? (
        <Link
          href={artifact.href}
          className="ml-auto inline-flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          {artifact.label}
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      ) : null}
    </li>
  );
}

function RunView({ run }: { run: AgentRun }) {
  const done = run.tasks.filter((t) => t.status === "completed").length;
  const pct = run.tasks.length ? Math.round((done / run.tasks.length) * 100) : 0;

  const headline =
    run.status === "running"
      ? "Working through the pipeline…"
      : run.status === "completed"
        ? "Episode package ready"
        : run.status === "partial"
          ? "Finished with some steps incomplete"
          : "The run could not be completed";

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                run.status === "completed"
                  ? "bg-success-500/15 text-success-300"
                  : run.status === "partial"
                    ? "bg-warning-500/15 text-warning-300"
                    : run.status === "failed"
                      ? "bg-error-500/15 text-error-300"
                      : "bg-primary-500/15 text-primary-300",
              )}
            >
              {run.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {done} of {run.tasks.length} steps
            </span>
          </div>

          <h2 className="font-display text-lg font-semibold">{headline}</h2>

          {run.status === "partial" ? (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-400" aria-hidden />
              Everything that finished is saved and usable — open the steps below.
            </p>
          ) : null}
        </header>

        {/* Progress bar */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Pipeline progress"
        >
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ul className="flex flex-col gap-2">
          {run.tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function AgentsWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [runs, setRuns] = React.useState<AgentRunSummary[]>([]);
  const [run, setRun] = React.useState<AgentRun | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [steps, setSteps] = React.useState<PipelineStep[]>(DEFAULT_STEPS);
  const [starting, setStarting] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadRuns = React.useCallback(async () => {
    try {
      const page = await agentsApi.listRuns();
      setRuns(page.items);
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
      await loadRuns();
    })();
    return () => controller.abort();
  }, [loadRuns]);

  // Poll while a run is in flight; stop the moment it settles.
  React.useEffect(() => {
    if (!run || run.status !== "running") return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const fresh = await agentsApi.getRun(run.id);
          setRun(fresh);
          if (fresh.status !== "running") await loadRuns();
        } catch {
          /* transient; the next tick retries */
        }
      })();
    }, 2500);
    return () => clearInterval(timer);
  }, [run, loadRuns]);

  const totalCredits = PIPELINE_STEPS.filter((s) => steps.includes(s.value)).reduce(
    (sum, s) => sum + s.credits,
    0,
  );

  const start = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const topic = String(form.get("topic") ?? "").trim();

    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    if (topic.length < 3) {
      setError("Describe the episode topic.");
      return;
    }
    if (steps.length === 0) {
      setError("Select at least one step.");
      return;
    }

    const duration = Number(form.get("duration_minutes") ?? 0);
    const guest = String(form.get("guest_name") ?? "").trim();
    const provider = String(form.get("provider") ?? "");

    setStarting(true);
    setError(null);
    try {
      const started = await agentsApi.createRun({
        project_id: projectId,
        topic,
        steps,
        ...(duration ? { duration_minutes: duration } : {}),
        ...(guest ? { guest_name: guest } : {}),
        ...(provider ? { provider: provider as "openai" | "anthropic" | "google" } : {}),
      });
      setRun(started);
      await loadRuns();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "INSUFFICIENT_CREDITS"
            ? "You do not have enough AI credits for these steps."
            : err.message
          : "Could not start the pipeline.",
      );
    } finally {
      setStarting(false);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Workflow}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to run the pipeline."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={start} className="flex flex-col gap-5">
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
                  <Label htmlFor="topic">Episode topic</Label>
                  <Input
                    id="topic"
                    name="topic"
                    placeholder="Why attention became the scarcest resource"
                    maxLength={500}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="duration_minutes">Target length (minutes)</Label>
                  <Input
                    id="duration_minutes"
                    name="duration_minutes"
                    type="number"
                    min={5}
                    max={180}
                    defaultValue={30}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="guest_name">Guest (optional)</Label>
                  <Input id="guest_name" name="guest_name" maxLength={200} />
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-medium">Steps to run</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PIPELINE_STEPS.map((step) => (
                    <label
                      key={step.value}
                      className="flex items-start gap-3 rounded border border-border/60 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={steps.includes(step.value)}
                        onChange={(e) =>
                          setSteps((all) =>
                            e.target.checked
                              ? [...all, step.value]
                              : all.filter((s) => s !== step.value),
                          )
                        }
                        className="mt-0.5 h-4 w-4 rounded border-border bg-input accent-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium">
                          {step.label}
                          <span className="text-xs font-normal text-muted-foreground">
                            {step.credits} credits
                          </span>
                        </span>
                        <span className="block text-xs text-muted-foreground">{step.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Steps run in order and feed each other — the outline uses the research, the
                  script uses the outline, SEO and social use the script.
                </p>
              </fieldset>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  loading={starting}
                  disabled={projects.length === 0 || run?.status === "running"}
                >
                  <Sparkles className="h-4 w-4" />
                  Run pipeline
                </Button>
                <span className="text-xs text-muted-foreground">
                  {totalCredits} credits · roughly {Math.max(1, steps.length)}–
                  {steps.length * 2} minutes
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        {run ? (
          <Appear>
            <RunView run={run} />
          </Appear>
        ) : null}

        {!run && !loading && projects.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="Create a project first"
            description="The pipeline writes into a project so every artifact it produces has a home."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent runs
        </h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your pipeline runs will appear here.</p>
        ) : (
          <Reveal className="flex flex-col gap-2">
            {runs.map((r) => (
              <Item key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    void agentsApi.getRun(r.id).then(setRun).catch(() => undefined);
                  }}
                  className={cn(
                    "w-full rounded border border-border/60 p-3 text-left transition-colors hover:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    run?.id === r.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <p className="truncate text-sm font-medium">{r.session_name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        r.status === "completed" && "text-success-300",
                        r.status === "partial" && "text-warning-300",
                        r.status === "failed" && "text-error-300",
                      )}
                    >
                      {r.status}
                    </span>
                    <span aria-hidden>·</span>
                    {r.completed_tasks}/{r.total_tasks} steps
                  </p>
                </button>
              </Item>
            ))}
          </Reveal>
        )}
      </aside>
    </div>
  );
}
