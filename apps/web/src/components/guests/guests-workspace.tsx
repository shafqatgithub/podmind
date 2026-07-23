"use client";

/**
 * Guest Intelligence workspace.
 *
 * This page shows AI-stated facts about a real person, so it is deliberately
 * honest about provenance: the confidence score is shown next to the name,
 * uncertainties are surfaced near the top rather than buried, and sources are
 * always visible. A host who trusts a wrong fact here embarrasses themselves
 * on air — the interface should make it easy to check, not easy to assume.
 */

import * as React from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  ExternalLink,
  Info,
  Mic2,
  Plus,
  Sparkles,
  StickyNote,
  Trash2,
  UserPlus,
  Users,
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
  guestsApi,
  QUESTION_GROUPS,
  type Guest,
  type GuestDetail,
} from "@/lib/api/guests";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

function Section({
  icon: Icon,
  title,
  children,
  accent = "text-primary-400",
}: {
  icon: typeof Users;
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

function GuestBriefing({
  guest,
  onAddNote,
}: {
  guest: GuestDetail;
  onAddNote: (note: string) => Promise<void>;
}) {
  const meta = guest.metadata ?? {};
  const confidence = meta.confidence_score ?? null;
  const [note, setNote] = React.useState("");
  const [savingNote, setSavingNote] = React.useState(false);

  const submitNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await onAddNote(note.trim());
      setNote("");
    } finally {
      setSavingNote(false);
    }
  };

  if (meta.unstructured) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-6">
          <h2 className="font-display text-xl font-bold">{guest.full_name}</h2>
          <p className="flex items-center gap-2 text-sm text-warning-400">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            The model returned unstructured text for this guest.
          </p>
          <p className="whitespace-pre-wrap text-sm">{guest.biography}</p>
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
                {PROVIDER_LABELS[meta.provider] ?? meta.provider}
                {meta.model ? ` · ${meta.model}` : ""}
              </Badge>
            ) : null}
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
            {guest.industry ? <Badge>{guest.industry}</Badge> : null}
          </div>

          <h2 className="font-display text-2xl font-bold">{guest.full_name}</h2>
          {guest.headline ? <p className="text-muted-foreground">{guest.headline}</p> : null}
          {guest.job_title || guest.company ? (
            <p className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" aria-hidden />
              {[guest.job_title, guest.company].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </header>

        {/* Uncertainties sit near the top on purpose: a caveat buried at the
            bottom of a long page is a caveat nobody reads. */}
        {meta.uncertainties?.length ? (
          <div className="flex flex-col gap-2 rounded border border-warning-500/30 bg-warning-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning-300">
              <Info className="h-4 w-4" aria-hidden />
              Verify before you record
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.uncertainties.map((u, i) => (
                <li key={i}>{u}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {guest.biography ? (
          <Section icon={Users} title="Biography">
            <p className="text-sm leading-relaxed">{guest.biography}</p>
          </Section>
        ) : null}

        {meta.career_timeline?.length ? (
          <Section icon={Briefcase} title="Career timeline" accent="text-purple-400">
            <ol className="flex flex-col gap-2 border-l border-border pl-4">
              {meta.career_timeline.map((t, i) => (
                <li key={i} className="text-sm">
                  <span className="font-mono text-xs text-purple-300">{t.date}</span>
                  <span className="ml-2">{t.event}</span>
                </li>
              ))}
            </ol>
          </Section>
        ) : null}

        {guest.companies.length ? (
          <Section icon={Building2} title="Companies" accent="text-cyan-400">
            <div className="flex flex-col gap-2">
              {guest.companies.map((c) => (
                <div key={c.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-semibold">{c.company_name}</span>
                  {c.role ? <span className="text-muted-foreground">— {c.role}</span> : null}
                  {c.is_current ? (
                    <Badge className="bg-success-500/15 text-success-300">Current</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {guest.books.length ? (
          <Section icon={BookOpen} title="Books">
            <ul className="flex flex-col gap-1.5 text-sm">
              {guest.books.map((b) => (
                <li key={b.id}>
                  <span className="font-medium">{b.title}</span>
                  {b.publisher ? (
                    <span className="text-muted-foreground"> — {b.publisher}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {meta.awards?.length ? (
          <Section icon={Award} title="Awards" accent="text-warning-400">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.awards.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {guest.interviews.length ? (
          <Section icon={Mic2} title="Past interviews" accent="text-purple-400">
            <ul className="flex flex-col gap-2 text-sm">
              {guest.interviews.map((i) => (
                <li key={i.id}>
                  {i.interview_url ? (
                    <a
                      href={i.interview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
                    >
                      {i.interview_title ?? i.platform}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    <span className="font-medium">{i.interview_title ?? i.platform}</span>
                  )}
                  {i.summary ? (
                    <span className="text-muted-foreground"> — {i.summary}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {meta.controversies?.length ? (
          <Section icon={AlertTriangle} title="Documented controversies" accent="text-error-400">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.controversies.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Verify independently before raising any of these on air.
            </p>
          </Section>
        ) : null}

        {meta.interesting_facts?.length ? (
          <Section icon={Sparkles} title="Interesting facts" accent="text-cyan-400">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.interesting_facts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {meta.conversation_opportunities?.length ? (
          <Section icon={Mic2} title="Conversation opportunities">
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {meta.conversation_opportunities.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        {/* Questions grouped the way a host runs an interview. */}
        {guest.questions.length
          ? QUESTION_GROUPS.map((group) => {
              const questions = guest.questions.filter((q) => q.question_type === group.type);
              if (questions.length === 0) return null;
              return (
                <Section key={group.type} icon={Mic2} title={group.label} accent="text-primary-400">
                  <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
                    {questions.map((q) => (
                      <li key={q.id}>{q.question}</li>
                    ))}
                  </ol>
                </Section>
              );
            })
          : null}

        {guest.social_profiles.length ? (
          <Section icon={ExternalLink} title="Profiles">
            <div className="flex flex-wrap gap-2">
              {guest.social_profiles.map((s) =>
                s.profile_url ? (
                  <a
                    key={s.id}
                    href={s.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-border/60 px-2.5 py-1 text-sm text-primary-400 hover:border-primary-500/40"
                  >
                    {s.platform}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <Badge key={s.id} className="capitalize">
                    {s.platform}
                    {s.username ? ` @${s.username}` : ""}
                  </Badge>
                ),
              )}
            </div>
          </Section>
        ) : null}

        {meta.sources?.length ? (
          <Section icon={BookOpen} title="Sources">
            <ul className="flex flex-col gap-1 text-sm">
              {meta.sources.map((s, i) => (
                <li key={i}>
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
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section icon={StickyNote} title="Your notes">
          {guest.notes.length ? (
            <ul className="flex flex-col gap-2">
              {guest.notes.map((n) => (
                <li key={n.id} className="rounded border border-border/60 p-3 text-sm">
                  {n.note}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-col gap-2">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={5000}
              placeholder="Add a private note about this guest…"
              aria-label="New note"
            />
            <div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={savingNote}
                disabled={!note.trim()}
                onClick={() => void submitNote()}
              >
                <Plus className="h-4 w-4" />
                Add note
              </Button>
            </div>
          </div>
        </Section>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- page */

export function GuestsWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [detail, setDetail] = React.useState<GuestDetail | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [mode, setMode] = React.useState<"research" | "manual">("research");
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadGuests = React.useCallback(async (project?: string) => {
    try {
      const page = await guestsApi.list(project ? { project_id: project } : {});
      setGuests(page.items);
    } catch {
      /* list is secondary */
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
      await loadGuests();
    })();
    return () => controller.abort();
  }, [loadGuests]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("full_name") ?? "").trim();

    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    if (fullName.length < 2) {
      setError("Enter the guest's name.");
      return;
    }

    setRunning(true);
    setError(null);
    try {
      const guest =
        mode === "research"
          ? await guestsApi.research({
              project_id: projectId,
              full_name: fullName,
              ...(String(form.get("context") ?? "").trim()
                ? { context: String(form.get("context")).trim() }
                : {}),
              ...(String(form.get("provider") ?? "")
                ? { provider: String(form.get("provider")) as "openai" | "anthropic" | "google" }
                : {}),
            })
          : await guestsApi.createManual({
              project_id: projectId,
              full_name: fullName,
              ...(String(form.get("company") ?? "").trim()
                ? { company: String(form.get("company")).trim() }
                : {}),
              ...(String(form.get("job_title") ?? "").trim()
                ? { job_title: String(form.get("job_title")).trim() }
                : {}),
              ...(String(form.get("email") ?? "").trim()
                ? { email: String(form.get("email")).trim() }
                : {}),
            });
      setDetail(guest);
      await loadGuests();
      event.currentTarget.reset();
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
        setError("Could not add the guest. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const open = async (id: string) => {
    setError(null);
    try {
      setDetail(await guestsApi.get(id));
    } catch {
      setError("Could not open that guest.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this guest?")) return;
    const snapshot = guests;
    setGuests((all) => all.filter((g) => g.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await guestsApi.remove(id);
    } catch {
      setGuests(snapshot);
    }
  };

  const addNote = async (note: string) => {
    if (!detail) return;
    await guestsApi.addNote(detail.id, note);
    setDetail(await guestsApi.get(detail.id));
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Users}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to start researching guests."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={submit} className="flex flex-col gap-5">
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

                {mode === "research" ? (
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
                ) : null}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "research" ? "primary" : "secondary"}
                  aria-pressed={mode === "research"}
                  onClick={() => setMode("research")}
                >
                  <Sparkles className="h-4 w-4" />
                  Research with AI
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "manual" ? "primary" : "secondary"}
                  aria-pressed={mode === "manual"}
                  onClick={() => setMode("manual")}
                >
                  <UserPlus className="h-4 w-4" />
                  Add manually
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="full_name">Guest name</Label>
                  <Input id="full_name" name="full_name" maxLength={200} required />
                </div>

                {mode === "research" ? (
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="context">Identifying details</Label>
                    <Input
                      id="context"
                      name="context"
                      maxLength={1000}
                      placeholder="Their company, role or profile link — helps avoid the wrong person"
                    />
                    <p className="text-xs text-muted-foreground">
                      Common names are easy to confuse. Details here make the briefing far more
                      reliable.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="company">Company</Label>
                      <Input id="company" name="company" maxLength={200} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="job_title">Role</Label>
                      <Input id="job_title" name="job_title" maxLength={200} />
                    </div>
                    <div className="flex flex-col gap-1.5 sm:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" maxLength={320} />
                    </div>
                  </>
                )}
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={running} disabled={projects.length === 0}>
                  {mode === "research" ? (
                    <>
                      <Sparkles className="h-4 w-4" /> Research guest
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Add guest
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {mode === "research" ? "Uses 8 AI credits" : "No credits used"}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        {running && mode === "research" ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <Sparkles className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
              <p className="text-sm">
                Building the briefing…
                <span className="ml-2 text-muted-foreground">Usually 20–60 seconds.</span>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {detail && !running ? (
          <Appear>
            <GuestBriefing guest={detail} onAddNote={addNote} />
          </Appear>
        ) : null}

        {!detail && !running && !loading && projects.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Create a project first"
            description="Guests belong to a project so their briefing inherits your show's context."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your guests
        </h2>
        {guests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Guests you add will appear here.</p>
        ) : (
          <Reveal className="flex flex-col gap-2">
            {guests.map((g) => (
              <Item key={g.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === g.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void open(g.id)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{g.full_name}</p>
                    {g.headline || g.company ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {g.headline ?? g.company}
                      </p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete guest: ${g.full_name}`}
                    onClick={() => void remove(g.id)}
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
