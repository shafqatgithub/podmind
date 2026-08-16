"use client";

/**
 * Content calendar.
 *
 * A month grid rather than a list, because the question this answers is
 * "what does my month look like" — a shape you see rather than read. Each
 * slot can start the pipeline, which is what turns a plan into work.
 */

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListPlus,
  Plus,
  Sparkles,
  Trash2,
  User,
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
import { LANGUAGES, projectsApi, type Project } from "@/lib/api/projects";
import {
  CALENDAR_STATUSES,
  calendarApi,
  type CalendarEntry,
  type CalendarStatus,
  type ScheduleProposal,
  type SuggestedEpisode,
} from "@/lib/api/calendar";
import { EmptyState } from "@/components/common/empty-state";
import { Appear } from "@/components/motion/motion";
import { isOutOfCredits, OutOfCreditsNotice, requiredCredits } from "@/components/common/credit-error";
import { ScheduleProposalReview } from "./schedule-proposal";
import { EntryDetail } from "./entry-detail";

const STATUS_STYLE: Record<CalendarStatus, string> = {
  planned: "bg-neutral-500/15 text-neutral-300",
  researching: "bg-primary-500/15 text-primary-300",
  recording: "bg-purple-500/15 text-purple-300",
  editing: "bg-warning-500/15 text-warning-300",
  published: "bg-success-500/15 text-success-300",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** ISO day string, avoiding timezone drift from toISOString on local dates. */
function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** The 6x7 grid a month view needs, Monday first. */
function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  // getDay is Sunday-first; shift so Monday is column zero.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

export function CalendarWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectId, setProjectId] = React.useState("");
  const [entries, setEntries] = React.useState<CalendarEntry[]>([]);
  const [cursor, setCursor] = React.useState(() => new Date());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [creditError, setCreditError] = React.useState<unknown>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [showPlan, setShowPlan] = React.useState(false);
  const [proposal, setProposal] = React.useState<ScheduleProposal | null>(null);
  const [suggesting, setSuggesting] = React.useState(false);
  const [language, setLanguage] = React.useState("");
  const [selected, setSelected] = React.useState<CalendarEntry | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [running, setRunning] = React.useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const grid = React.useMemo(() => monthGrid(year, month), [year, month]);

  const load = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const page = await calendarApi.list({
        project_id: projectId,
        from: isoDay(grid[0]!),
        to: isoDay(grid[grid.length - 1]!),
      });
      setEntries(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the calendar.");
    }
  }, [projectId, grid]);

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
    })();
    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const byDay = React.useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const entry of entries) {
      const key = new Date(entry.scheduled_for).toISOString().slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return map;
  }, [entries]);

  const addEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setCreditError(null);
    try {
      await calendarApi.create({
        project_id: projectId,
        title: String(form.get("title") ?? ""),
        scheduled_for: String(form.get("scheduled_for") ?? ""),
        ...(String(form.get("topic") ?? "").trim()
          ? { topic: String(form.get("topic")).trim() }
          : {}),
        ...(String(form.get("publish_at") ?? "")
          ? { publish_at: String(form.get("publish_at")) }
          : {}),
        ...(String(form.get("notes") ?? "").trim()
          ? { notes: String(form.get("notes")).trim() }
          : {}),
      });
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the episode.");
    } finally {
      setBusy(false);
    }
  };

  /** Ask for a proposal. Nothing is written until the host approves it. */
  const suggestSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSuggesting(true);
    setError(null);
    setCreditError(null);
    try {
      const result = await calendarApi.suggest({
        project_id: projectId,
        count: Number(form.get("count") ?? 4) || 4,
        cadence: String(form.get("cadence") ?? "weekly") as "weekly" | "biweekly" | "monthly",
        ...(String(form.get("start_date") ?? "")
          ? { start_date: String(form.get("start_date")) }
          : {}),
        ...(String(form.get("theme") ?? "").trim()
          ? { theme: String(form.get("theme")).trim() }
          : {}),
        ...(language ? { language } : {}),
      });
      setProposal(result);
      setShowPlan(false);
    } catch (err) {
      setCreditError(isOutOfCredits(err) ? err : null);
      setError(err instanceof ApiError ? err.message : "Could not plan a run.");
    } finally {
      setSuggesting(false);
    }
  };

  /** Save the approved episodes, keeping each one's own date. */
  const approveProposal = async (episodes: SuggestedEpisode[]) => {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      // Created one at a time so an episode the host moved keeps its date;
      // the bulk plan endpoint re-derives dates from the cadence.
      for (const episode of episodes) {
        await calendarApi.create({
          project_id: projectId,
          title: episode.title,
          scheduled_for: episode.scheduled_for,
          ...(episode.topic ? { topic: episode.topic } : {}),
          ...(episode.notes || episode.angle
            ? { notes: [episode.angle, episode.notes].filter(Boolean).join("\n\n") }
            : {}),
        });
      }
      setProposal(null);
      setCursor(new Date(`${episodes[0]!.scheduled_for}T00:00:00`));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the plan.");
    } finally {
      setBusy(false);
    }
  };

  const runPipeline = async (entry: CalendarEntry) => {
    setRunning(entry.id);
    setError(null);
    try {
      await calendarApi.run(entry.id);
      await load();
    } catch (err) {
      setCreditError(isOutOfCredits(err) ? err : null);
      setError(
        err instanceof ApiError
          ? err.code === "INSUFFICIENT_CREDITS"
            ? "You are out of AI credits."
            : err.message
          : "Could not start the pipeline.",
      );
    } finally {
      setRunning(null);
    }
  };

  const setStatus = async (entry: CalendarEntry, status: CalendarStatus) => {
    setEntries((all) => all.map((e) => (e.id === entry.id ? { ...e, status } : e)));
    try {
      await calendarApi.update(entry.id, { status });
    } catch {
      await load();
    }
  };

  /** Save edits made in the detail panel, keeping it open on the fresh row. */
  const saveEntry = async (id: string, patch: Record<string, string>) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await calendarApi.update(id, patch);
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the changes.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: CalendarEntry) => {
    if (!window.confirm(`Remove "${entry.title}" from the calendar?`)) return;
    setEntries((all) => all.filter((e) => e.id !== entry.id));
    try {
      await calendarApi.remove(entry.id);
    } catch {
      await load();
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to plan episodes."
      />
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Create a project first"
        description="The calendar plans episodes for a project, so the pipeline knows where to put the work."
      />
    );
  }

  const todayKey = isoDay(new Date());

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <Skeleton className="h-10 w-48 rounded" />
        ) : (
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Project"
            className="w-52"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-40 text-center font-display font-semibold">
            {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          Today
        </Button>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowPlan((v) => !v)}>
            <ListPlus className="h-4 w-4" />
            Plan a run
          </Button>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add episode
          </Button>
        </div>
      </div>

      {creditError ? (
  <OutOfCreditsNotice required={requiredCredits(creditError)} />
) : error ? (
  <p role="alert" className="text-sm text-error-400">
    {error}
  </p>
) : null}

      {selected ? (
        <Appear>
          <EntryDetail
            entry={selected}
            running={running === selected.id}
            saving={busy}
            onRun={(entry) => void runPipeline(entry)}
            onSave={(id, patch) => void saveEntry(id, patch)}
            onDelete={(entry) => {
              setSelected(null);
              void remove(entry);
            }}
            onClose={() => setSelected(null)}
          />
        </Appear>
      ) : null}

      {proposal ? (
        <Appear>
          <ScheduleProposalReview
            proposal={proposal}
            saving={busy}
            onApprove={approveProposal}
            onDiscard={() => setProposal(null)}
          />
        </Appear>
      ) : null}

      {showPlan ? (
        <Appear>
          <Card>
            <CardContent className="p-6">
              <form onSubmit={suggestSchedule} className="flex flex-col gap-4">
                <div>
                  <h2 className="font-display font-semibold">Plan a run of episodes</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    PodMind proposes the episodes and the dates. You review them before
                    anything is added to your calendar.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="theme">What should this run be about? (optional)</Label>
                  <Input
                    id="theme"
                    name="theme"
                    maxLength={500}
                    placeholder="Leave empty and PodMind will use your niche and audience"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="count">How many</Label>
                    <Input
                      id="count"
                      name="count"
                      type="number"
                      min={1}
                      max={12}
                      defaultValue={4}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="start_date">Start</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      defaultValue={todayKey}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cadence">Cadence</Label>
                    <Select id="cadence" name="cadence" defaultValue="weekly">
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Every two weeks</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="">Project default</option>
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" loading={suggesting}>
                    <Sparkles className="h-4 w-4" />
                    Plan my episodes
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowPlan(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Appear>
      ) : null}

      {showAdd ? (
        <Appear>
          <Card>
            <CardContent className="p-6">
              <form onSubmit={addEntry} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="title">Episode title</Label>
                    <Input id="title" name="title" maxLength={200} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="scheduled_for">Record on</Label>
                    <Input
                      id="scheduled_for"
                      name="scheduled_for"
                      type="date"
                      defaultValue={todayKey}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="publish_at">Publish on (optional)</Label>
                    <Input id="publish_at" name="publish_at" type="date" />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="topic">Topic (optional)</Label>
                    <Input id="topic" name="topic" maxLength={500} />
                    <p className="text-xs text-muted-foreground">
                      Used when the pipeline runs. Defaults to the title.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea id="notes" name="notes" rows={2} maxLength={2000} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" loading={busy}>
                    Add to calendar
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Appear>
      ) : null}

      {/* Month grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs"
              >
                {day}
              </div>
            ))}

            {grid.map((date) => {
              const key = isoDay(date);
              const dayEntries = byDay.get(key) ?? [];
              const inMonth = date.getMonth() === month;
              const isToday = key === todayKey;

              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-20 rounded border p-1 sm:min-h-28 sm:p-2",
                    inMonth ? "border-border/60" : "border-transparent opacity-40",
                    isToday && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "text-[10px] sm:text-xs",
                        isToday ? "font-bold text-primary-300" : "text-muted-foreground",
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelected(entry)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelected(entry);
                          }
                        }}
                        aria-label={`Open ${entry.title}`}
                        className={cn(
                          "group cursor-pointer rounded bg-card/80 p-1 text-left transition-colors sm:p-1.5",
                          "hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                          selected?.id === entry.id && "ring-1 ring-primary-500/50",
                        )}
                      >
                        <p className="truncate text-[10px] font-medium sm:text-xs">
                          {entry.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge
                            className={cn("text-[9px]", STATUS_STYLE[entry.status])}
                          >
                            {entry.status}
                          </Badge>
                          {entry.guest_name ? (
                            <span className="hidden items-center gap-0.5 text-[9px] text-muted-foreground sm:inline-flex">
                              <User className="h-2.5 w-2.5" aria-hidden />
                              {entry.guest_name.split(" ")[0]}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 hidden flex-wrap gap-1 sm:flex">
                          {entry.agent_session_id ? (
                            <Link
                              href="/agents"
                              className="text-[9px] text-primary-400 hover:text-primary-300"
                            >
                              View run
                            </Link>
                          ) : (
                            <button
                              type="button"
                              disabled={running !== null}
                              onClick={(e) => {
                                e.stopPropagation();
                                void runPipeline(entry);
                              }}
                              className="inline-flex items-center gap-0.5 text-[9px] text-primary-400 hover:text-primary-300 disabled:opacity-50"
                            >
                              <Sparkles className="h-2.5 w-2.5" aria-hidden />
                              {running === entry.id ? "Starting…" : "Run"}
                            </button>
                          )}
                          <select
                            value={entry.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              void setStatus(entry, e.target.value as CalendarStatus);
                            }}
                            aria-label={`Status for ${entry.title}`}
                            className="rounded bg-transparent text-[9px] text-muted-foreground focus-visible:outline-none"
                          >
                            {CALENDAR_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            aria-label={`Remove ${entry.title}`}
                            onClick={() => void remove(entry)}
                            className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-error-400 group-hover:opacity-100"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Running a slot starts the Episode Pipeline for that topic and links the result back here.
      </p>
    </div>
  );
}
