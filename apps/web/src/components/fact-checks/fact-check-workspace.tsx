"use client";

/**
 * Fact Checker workspace.
 *
 * The product decision here is verdict-first: a host scanning this page
 * before recording needs to see what is wrong, not admire a summary. So
 * flagged claims sort to the top, corrections are shown as the line to say
 * instead, and a claim with no evidence is labelled as such rather than
 * dressed up as a verified fact.
 */

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  ScanSearch,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Label,
  Select,
  Skeleton,
  Textarea,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import { scriptsApi, type Script } from "@/lib/api/scripts";
import { aiApi, PROVIDER_LABELS, type AiStatus } from "@/lib/api/ai";
import {
  factChecksApi,
  type ClaimVerdict,
  type FactCheck,
  type FactCheckClaim,
  type FactCheckDetail,
} from "@/lib/api/fact-checks";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item, Reveal } from "@/components/motion/motion";

/* -------------------------------------------------------- verdicts */

const VERDICT: Record<
  ClaimVerdict,
  { label: string; icon: typeof CheckCircle2; badge: string; accent: string; rank: number }
> = {
  false: {
    label: "False",
    icon: XCircle,
    badge: "bg-error-500/15 text-error-300",
    accent: "border-l-error-500",
    rank: 0,
  },
  disputed: {
    label: "Disputed",
    icon: AlertTriangle,
    badge: "bg-warning-500/15 text-warning-300",
    accent: "border-l-warning-500",
    rank: 1,
  },
  unverified: {
    label: "Unverified",
    icon: HelpCircle,
    badge: "bg-neutral-500/15 text-neutral-300",
    accent: "border-l-neutral-500",
    rank: 2,
  },
  partially_verified: {
    label: "Partly verified",
    icon: AlertTriangle,
    badge: "bg-cyan-500/15 text-cyan-300",
    accent: "border-l-cyan-500",
    rank: 3,
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2,
    badge: "bg-success-500/15 text-success-300",
    accent: "border-l-success-500",
    rank: 4,
  },
};

/** Riskiest first — this page exists to surface problems. */
function byRisk(a: FactCheckClaim, b: FactCheckClaim): number {
  const diff = VERDICT[a.verdict].rank - VERDICT[b.verdict].rank;
  return diff !== 0 ? diff : a.sort_order - b.sort_order;
}

function ClaimCard({ claim }: { claim: FactCheckClaim }) {
  const verdict = VERDICT[claim.verdict];
  const Icon = verdict.icon;
  const evidence = claim.evidence ?? [];

  return (
    <div className={cn("flex flex-col gap-3 rounded border border-border/60 border-l-2 p-4", verdict.accent)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={verdict.badge}>
          <Icon className="mr-1 h-3 w-3" aria-hidden />
          {verdict.label}
        </Badge>
        <Badge className="capitalize">{claim.claim_type}</Badge>
        {claim.confidence !== null ? (
          <span className="text-xs text-muted-foreground">
            {Math.round(claim.confidence * 100)}% confidence
          </span>
        ) : null}
      </div>

      <blockquote className="border-l-2 border-border pl-3 text-sm italic">
        {claim.claim}
      </blockquote>

      {claim.explanation ? <p className="text-sm">{claim.explanation}</p> : null}

      {claim.correction ? (
        <div className="rounded bg-success-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-success-300">
            Say this instead
          </p>
          <p className="mt-1 text-sm">{claim.correction}</p>
        </div>
      ) : null}

      {evidence.length ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Evidence
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {evidence.map((e, i) => (
              <li key={i} className="text-muted-foreground">
                {e.url ? (
                  <a
                    href={e.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300"
                  >
                    {e.source ?? e.url}
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-foreground">{e.source}</span>
                )}
                {e.detail ? <span> — {e.detail}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No supporting evidence was found for this claim.
        </p>
      )}
    </div>
  );
}

function VerdictSummary({ check }: { check: FactCheckDetail }) {
  const safe = check.total_claims - check.flagged_claims;
  const pct = check.total_claims ? Math.round((check.verified_claims / check.total_claims) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <ShieldCheck
          className={cn(
            "h-5 w-5",
            check.flagged_claims === 0 ? "text-success-400" : "text-warning-400",
          )}
          aria-hidden
        />
        <span className="font-display font-semibold">
          {check.flagged_claims === 0
            ? "Nothing flagged"
            : `${check.flagged_claims} claim${check.flagged_claims === 1 ? "" : "s"} need attention`}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{check.total_claims} claims checked</span>
        <span aria-hidden>·</span>
        <span className="text-success-300">{check.verified_claims} verified</span>
        {safe !== check.verified_claims ? (
          <>
            <span aria-hidden>·</span>
            <span>{pct}% fully verified</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- page */

type SourceKind = "text" | "script";

export function FactCheckWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [scripts, setScripts] = React.useState<Script[]>([]);
  const [checks, setChecks] = React.useState<FactCheck[]>([]);
  const [detail, setDetail] = React.useState<FactCheckDetail | null>(null);
  const [aiStatus, setAiStatus] = React.useState<AiStatus | null>(null);
  const [projectId, setProjectId] = React.useState("");
  const [sourceKind, setSourceKind] = React.useState<SourceKind>("text");
  const [running, setRunning] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadChecks = React.useCallback(async (project?: string) => {
    try {
      const page = await factChecksApi.list(project ? { project_id: project } : {});
      setChecks(page.items);
    } catch {
      // History is secondary; the form stays usable.
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
        /* provider selector simply stays on Auto */
      }
      await loadChecks();
    })();
    return () => controller.abort();
  }, [loadChecks]);

  // Scripts belong to a project, so reload them whenever the project changes.
  React.useEffect(() => {
    if (!projectId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const page = await scriptsApi.list(projectId, controller.signal);
        setScripts(page.items);
      } catch {
        setScripts([]);
      }
    })();
    return () => controller.abort();
  }, [projectId]);

  const run = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const provider = String(form.get("provider") ?? "");
    const text = String(form.get("text") ?? "").trim();
    const scriptId = String(form.get("script_id") ?? "");

    if (!projectId) {
      setError("Choose a project first.");
      return;
    }
    if (sourceKind === "text" && text.length < 50) {
      setError("Paste at least a couple of sentences to check.");
      return;
    }
    if (sourceKind === "script" && !scriptId) {
      setError("Choose a script to check.");
      return;
    }

    setRunning(true);
    setError(null);
    setDetail(null);
    try {
      const result = await factChecksApi.create({
        project_id: projectId,
        ...(sourceKind === "text" ? { text } : { script_id: scriptId }),
        ...(provider ? { provider: provider as "openai" | "anthropic" | "google" } : {}),
      });
      setDetail(result);
      await loadChecks();
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
        setError("The fact check failed. Please try again.");
      }
    } finally {
      setRunning(false);
    }
  };

  const open = async (id: string) => {
    setError(null);
    try {
      setDetail(await factChecksApi.get(id));
    } catch {
      setError("Could not open that fact check.");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this fact check?")) return;
    const snapshot = checks;
    setChecks((all) => all.filter((c) => c.id !== id));
    if (detail?.id === id) setDetail(null);
    try {
      await factChecksApi.remove(id);
    } catch {
      setChecks(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={ScanSearch}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to start checking claims."
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

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium">What should I check?</span>
                <div className="flex gap-2">
                  {(["text", "script"] as const).map((kind) => (
                    <Button
                      key={kind}
                      type="button"
                      variant={sourceKind === kind ? "primary" : "secondary"}
                      size="sm"
                      aria-pressed={sourceKind === kind}
                      onClick={() => setSourceKind(kind)}
                    >
                      {kind === "text" ? (
                        <>
                          <FileText className="h-4 w-4" /> Pasted text
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" /> A script
                        </>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {sourceKind === "text" ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="text">Text to check</Label>
                  <Textarea
                    id="text"
                    name="text"
                    rows={8}
                    maxLength={100000}
                    placeholder="Paste the passage, script section or notes you want verified…"
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="script_id">Script</Label>
                  <Select id="script_id" name="script_id" defaultValue="">
                    <option value="" disabled>
                      {scripts.length ? "Choose a script" : "No scripts in this project"}
                    </option>
                    {scripts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <div className="flex items-center gap-3">
                <Button type="submit" loading={running} disabled={projects.length === 0}>
                  <ScanSearch className="h-4 w-4" />
                  Check the facts
                </Button>
                <span className="text-xs text-muted-foreground">
                  Claims are judged individually with evidence
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        {running ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <ScanSearch className="h-5 w-5 animate-pulse text-primary-400" aria-hidden />
              <p className="text-sm">
                Extracting claims and checking each one…
                <span className="ml-2 text-muted-foreground">This usually takes 20–60 seconds.</span>
              </p>
            </CardContent>
          </Card>
        ) : null}

        {detail && !running ? (
          <Appear>
            <Card>
              <CardContent className="flex flex-col gap-6 p-6">
                <header className="flex flex-col gap-3">
                  <h2 className="font-display text-xl font-bold">{detail.title}</h2>
                  <VerdictSummary check={detail} />
                  {detail.ai_provider ? (
                    <span className="text-xs text-muted-foreground">
                      Checked by {PROVIDER_LABELS[detail.ai_provider] ?? detail.ai_provider}
                      {detail.model_name ? ` · ${detail.model_name}` : ""}
                    </span>
                  ) : null}
                </header>

                {detail.claims.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No checkable factual claims were found in this text.
                  </p>
                ) : (
                  <Reveal className="flex flex-col gap-3">
                    {[...detail.claims].sort(byRisk).map((claim) => (
                      <Item key={claim.id}>
                        <ClaimCard claim={claim} />
                      </Item>
                    ))}
                  </Reveal>
                )}
              </CardContent>
            </Card>
          </Appear>
        ) : null}

        {!detail && !running && !loading && projects.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="Create a project first"
            description="Fact checks are attached to a project so a verdict can be traced back to the episode it belongs to."
          />
        ) : null}
      </div>

      <aside className="flex w-full flex-col gap-3 lg:w-72 lg:shrink-0">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent checks
        </h2>
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your fact checks will appear here.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {checks.map((c) => (
              <li key={c.id}>
                <div
                  className={cn(
                    "group flex items-start gap-2 rounded border border-border/60 p-3 transition-colors hover:border-primary-500/40",
                    detail?.id === c.id && "border-primary-500/60 bg-primary-500/5",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void open(c.id)}
                    className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <p className="truncate text-sm font-medium">{c.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                      {c.flagged_claims > 0 ? (
                        <span className="text-warning-300">{c.flagged_claims} flagged</span>
                      ) : (
                        <span className="text-success-300">All clear</span>
                      )}
                      <span aria-hidden className="text-muted-foreground">
                        ·
                      </span>
                      <span className="text-muted-foreground">{c.total_claims} claims</span>
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete fact check: ${c.title}`}
                    onClick={() => void remove(c.id)}
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
