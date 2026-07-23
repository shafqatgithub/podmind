"use client";

/**
 * Admin panel.
 *
 * This is the operator's view, not a customer's, and it is the one screen
 * that reads across every tenant. Two consequences shape it:
 *
 * - It shows aggregates, never content. An admin can see that an
 *   organization ran 400 requests; they cannot read anyone's script from
 *   here, because nothing on this page has a reason to show that.
 * - A non-admin reaching this page gets a plain "not available" rather than
 *   an error dump, since the API already refused them and the UI should not
 *   confirm what does or does not exist behind the door.
 */

import * as React from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Check,
  Flag,
  Megaphone,
  ShieldAlert,
  Ticket,
  Trash2,
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
  Textarea,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import {
  adminApi,
  type AdminDashboard,
  type AdminOrganization,
  type Announcement,
  type FeatureFlag,
  type SupportTicket,
} from "@/lib/api/admin";
import { EmptyState } from "@/components/common/empty-state";
import { Item, Reveal } from "@/components/motion/motion";

type Tab = "overview" | "organizations" | "flags" | "announcements" | "tickets";

const TABS: { value: Tab; label: string; icon: typeof Activity }[] = [
  { value: "overview", label: "Overview", icon: Activity },
  { value: "organizations", label: "Organizations", icon: Building2 },
  { value: "flags", label: "Feature flags", icon: Flag },
  { value: "announcements", label: "Announcements", icon: Megaphone },
  { value: "tickets", label: "Support", icon: Ticket },
];

function Stat({
  label,
  value,
  tone = "text-foreground",
  hint,
}: {
  label: string;
  value: string | number;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="rounded border border-border/60 p-4">
      <p className={cn("font-display text-2xl font-bold", tone)}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------ overview */

function Overview({ data }: { data: AdminDashboard }) {
  const { overview, health, breakdown, errors, usage } = data;
  const failureRate = health.ai.failure_rate;
  const peak = Math.max(1, ...usage.map((d) => Number(d.requests)));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={Number(overview.users)} hint={`+${overview.users_7d} this week`} />
        <Stat label="Organizations" value={Number(overview.organizations)} />
        <Stat label="Projects" value={Number(overview.projects)} />
        <Stat
          label="Active subscriptions"
          value={Number(overview.active_subscriptions)}
          tone="text-primary-300"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI requests" value={Number(overview.ai_requests)} />
        <Stat
          label="AI failures"
          value={Number(overview.ai_failures)}
          tone={Number(overview.ai_failures) > 0 ? "text-warning-300" : "text-foreground"}
        />
        <Stat label="Tokens processed" value={Number(overview.tokens)} />
        <Stat
          label="Estimated AI cost"
          value={`$${Number(overview.ai_cost).toFixed(2)}`}
          hint="What the providers cost us"
        />
      </div>

      {/* Health */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h3 className="flex items-center gap-2 font-display font-semibold">
            <Activity className="h-4 w-4 text-primary-400" aria-hidden />
            System health
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Database"
              value={health.database.status === "up" ? "Up" : "Down"}
              tone={health.database.status === "up" ? "text-success-300" : "text-error-300"}
              hint={`${health.database.latency_ms}ms`}
            />
            <Stat
              label="AI failure rate (1h)"
              value={`${Math.round(failureRate * 100)}%`}
              tone={
                failureRate > 0.25
                  ? "text-error-300"
                  : failureRate > 0.05
                    ? "text-warning-300"
                    : "text-success-300"
              }
              hint={`${health.ai.requests_1h} requests`}
            />
            <Stat label="Pipelines running" value={health.pipelines.running} />
            <Stat
              label="Stuck tasks"
              value={health.pipelines.stuck}
              tone={health.pipelines.stuck > 0 ? "text-warning-300" : "text-foreground"}
              hint={health.pipelines.stuck > 0 ? "Queued over 20 minutes" : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage sparkline */}
      {usage.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <h3 className="font-display font-semibold">AI requests, last 30 days</h3>
            <div className="flex h-24 items-end gap-1" aria-hidden>
              {usage.map((day) => (
                <div
                  key={day.day}
                  className="flex-1 rounded-t bg-brand-gradient"
                  style={{ height: `${(Number(day.requests) / peak) * 100}%`, minHeight: 2 }}
                  title={`${day.day}: ${day.requests} requests`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Peak {peak.toLocaleString()} requests in a day
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Task breakdown */}
      {breakdown.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h3 className="font-display font-semibold">Where the AI budget goes</h3>
            <ul className="flex flex-col gap-2">
              {breakdown.map((row) => (
                <li key={row.task} className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge className="capitalize">{row.task}</Badge>
                  <span>{Number(row.requests).toLocaleString()} requests</span>
                  {Number(row.failures) > 0 ? (
                    <span className="text-warning-300">{row.failures} failed</span>
                  ) : null}
                  <span className="text-muted-foreground">
                    {Number(row.tokens).toLocaleString()} tokens
                  </span>
                  {row.avg_latency_ms ? (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {Math.round(Number(row.avg_latency_ms))}ms avg
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Recent errors */}
      {errors.length > 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h3 className="flex items-center gap-2 font-display font-semibold">
              <AlertTriangle className="h-4 w-4 text-warning-400" aria-hidden />
              Recent AI failures
            </h3>
            <ul className="flex flex-col gap-2">
              {errors.map((err) => (
                <li key={err.id} className="rounded border border-border/60 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="capitalize">{err.task}</Badge>
                    {err.organization_name ? (
                      <span className="text-xs text-muted-foreground">
                        {err.organization_name}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(err.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                    {err.error_message}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------- organizations */

function Organizations({ items }: { items: AdminOrganization[] }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Organization</th>
                <th className="pb-2 pr-4 font-medium">Projects</th>
                <th className="pb-2 pr-4 font-medium">AI requests</th>
                <th className="pb-2 pr-4 font-medium">Credits left</th>
                <th className="pb-2 pr-4 font-medium">Plan</th>
                <th className="pb-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {items.map((org) => (
                <tr key={org.id} className="border-b border-border/40">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{org.name}</span>
                  </td>
                  <td className="py-2.5 pr-4">{org.projects}</td>
                  <td className="py-2.5 pr-4">{Number(org.ai_requests).toLocaleString()}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={cn(
                        Number(org.available_credits ?? 0) < 50 && "text-warning-300",
                      )}
                    >
                      {Number(org.available_credits ?? 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge className="capitalize">{org.subscription_status ?? "free"}</Badge>
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {org.last_activity
                      ? new Date(org.last_activity).toLocaleDateString()
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Usage only — customer content is never surfaced here.
        </p>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- page */

export function AdminWorkspace() {
  const [tab, setTab] = React.useState<Tab>("overview");
  const [dashboard, setDashboard] = React.useState<AdminDashboard | null>(null);
  const [orgs, setOrgs] = React.useState<AdminOrganization[]>([]);
  const [flags, setFlags] = React.useState<FeatureFlag[]>([]);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [forbidden, setForbidden] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setDashboard(await adminApi.dashboard(controller.signal));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
        } else {
          setError(
            err instanceof ApiError && err.isUnreachable
              ? "The PodMind API is not reachable right now."
              : "Could not load the admin dashboard.",
          );
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // Each tab fetches on first visit rather than loading everything up front.
  React.useEffect(() => {
    if (forbidden) return;
    void (async () => {
      try {
        if (tab === "organizations" && orgs.length === 0) {
          setOrgs((await adminApi.organizations()).items);
        } else if (tab === "flags" && flags.length === 0) {
          setFlags((await adminApi.flags()).items);
        } else if (tab === "announcements" && announcements.length === 0) {
          setAnnouncements((await adminApi.announcements()).items);
        } else if (tab === "tickets" && tickets.length === 0) {
          setTickets((await adminApi.tickets()).items);
        }
      } catch {
        setError("Could not load that section.");
      }
    })();
  }, [tab, forbidden, orgs.length, flags.length, announcements.length, tickets.length]);

  const toggleFlag = async (flag: FeatureFlag) => {
    const next = !flag.enabled;
    setFlags((all) => all.map((f) => (f.id === flag.id ? { ...f, enabled: next } : f)));
    try {
      await adminApi.upsertFlag({ name: flag.name, enabled: next });
    } catch {
      setFlags((all) => all.map((f) => (f.id === flag.id ? { ...f, enabled: !next } : f)));
      setError("Could not update the flag.");
    }
  };

  const addFlag = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;
    setBusy(true);
    try {
      await adminApi.upsertFlag({
        name,
        description: String(form.get("description") ?? "") || undefined,
        enabled: false,
      });
      setFlags((await adminApi.flags()).items);
      event.currentTarget.reset();
    } catch {
      setError("Could not create the flag.");
    } finally {
      setBusy(false);
    }
  };

  const removeFlag = async (flag: FeatureFlag) => {
    if (!window.confirm(`Delete the flag "${flag.name}"?`)) return;
    const snapshot = flags;
    setFlags((all) => all.filter((f) => f.id !== flag.id));
    try {
      await adminApi.deleteFlag(flag.id);
    } catch {
      setFlags(snapshot);
    }
  };

  const addAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await adminApi.createAnnouncement({
        title: String(form.get("title") ?? ""),
        message: String(form.get("message") ?? ""),
        severity: String(form.get("severity") ?? "info"),
      });
      setAnnouncements((await adminApi.announcements()).items);
      event.currentTarget.reset();
    } catch {
      setError("Could not publish the announcement.");
    } finally {
      setBusy(false);
    }
  };

  const updateTicket = async (ticket: SupportTicket, status: string) => {
    try {
      await adminApi.updateTicket(ticket.id, status);
      setTickets((await adminApi.tickets()).items);
    } catch {
      setError("Could not update the ticket.");
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API."
      />
    );
  }

  if (forbidden) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not available"
        description="This area is limited to platform administrators."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-2" aria-label="Admin sections">
        {TABS.map(({ value, label, icon: Icon }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={tab === value ? "primary" : "secondary"}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
      </nav>

      {error ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {tab === "overview" && dashboard ? <Overview data={dashboard} /> : null}

      {tab === "organizations" ? (
        orgs.length ? (
          <Organizations items={orgs} />
        ) : (
          <Skeleton className="h-64 rounded-lg" />
        )
      ) : null}

      {tab === "flags" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={addFlag} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="flag_name">Flag name</Label>
                  <Input id="flag_name" name="name" placeholder="new_editor" maxLength={100} required />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="flag_description">Description</Label>
                  <Input id="flag_description" name="description" maxLength={500} />
                </div>
                <Button type="submit" loading={busy}>
                  Add flag
                </Button>
              </form>
            </CardContent>
          </Card>

          {flags.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No feature flags yet"
              description="Flags let you ship code dark and turn it on when you are ready."
            />
          ) : (
            <Reveal className="flex flex-col gap-2">
              {flags.map((flag) => (
                <Item key={flag.id}>
                  <div className="flex flex-wrap items-center gap-3 rounded border border-border/60 p-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={flag.enabled}
                      aria-label={`Toggle ${flag.name}`}
                      onClick={() => void toggleFlag(flag)}
                      className={cn(
                        "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                        flag.enabled ? "bg-brand-gradient" : "bg-border",
                      )}
                    >
                      <span
                        className={cn(
                          "h-5 w-5 rounded-full bg-white transition-transform",
                          flag.enabled && "translate-x-5",
                        )}
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <code className="font-mono text-sm font-medium">{flag.name}</code>
                      {flag.description ? (
                        <p className="text-xs text-muted-foreground">{flag.description}</p>
                      ) : null}
                    </div>
                    {flag.rollout_percentage > 0 && flag.rollout_percentage < 100 ? (
                      <Badge>{flag.rollout_percentage}% rollout</Badge>
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Delete ${flag.name}`}
                      onClick={() => void removeFlag(flag)}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Item>
              ))}
            </Reveal>
          )}
        </div>
      ) : null}

      {tab === "announcements" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6">
              <form onSubmit={addAnnouncement} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="ann_title">Title</Label>
                    <Input id="ann_title" name="title" maxLength={200} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ann_severity">Severity</Label>
                    <Select id="ann_severity" name="severity" defaultValue="info">
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-3">
                    <Label htmlFor="ann_message">Message</Label>
                    <Textarea id="ann_message" name="message" rows={3} maxLength={2000} required />
                  </div>
                </div>
                <div>
                  <Button type="submit" loading={busy}>
                    Publish
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="No announcements"
              description="Publish one to show a banner to every user."
            />
          ) : (
            <Reveal className="flex flex-col gap-2">
              {announcements.map((a) => (
                <Item key={a.id}>
                  <div className="flex flex-col gap-2 rounded border border-border/60 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={cn(
                          a.severity === "critical"
                            ? "bg-error-500/15 text-error-300"
                            : a.severity === "warning"
                              ? "bg-warning-500/15 text-warning-300"
                              : "bg-primary-500/15 text-primary-300",
                        )}
                      >
                        {a.severity}
                      </Badge>
                      <span className="font-medium">{a.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          void adminApi
                            .setAnnouncementActive(a.id, !a.is_active)
                            .then(() =>
                              setAnnouncements((all) =>
                                all.map((x) =>
                                  x.id === a.id ? { ...x, is_active: !a.is_active } : x,
                                ),
                              ),
                            )
                            .catch(() => setError("Could not update the announcement."))
                        }
                        className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        {a.is_active ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-success-400" /> Live
                          </>
                        ) : (
                          <>
                            <X className="h-3.5 w-3.5 text-muted-foreground" /> Hidden
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground">{a.message}</p>
                  </div>
                </Item>
              ))}
            </Reveal>
          )}
        </div>
      ) : null}

      {tab === "tickets" ? (
        tickets.length === 0 ? (
          <EmptyState
            icon={Ticket}
            title="No support tickets"
            description="Tickets raised by customers will appear here, most urgent first."
          />
        ) : (
          <Reveal className="flex flex-col gap-2">
            {tickets.map((t) => (
              <Item key={t.id}>
                <div className="flex flex-col gap-2 rounded border border-border/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        t.priority === "urgent"
                          ? "bg-error-500/15 text-error-300"
                          : t.priority === "high"
                            ? "bg-warning-500/15 text-warning-300"
                            : "bg-neutral-500/15 text-neutral-300",
                      )}
                    >
                      {t.priority}
                    </Badge>
                    <span className="font-medium">{t.subject}</span>
                    <Select
                      value={t.status}
                      onChange={(e) => void updateTicket(t, e.target.value)}
                      aria-label={`Status for ${t.subject}`}
                      className="ml-auto w-36"
                    >
                      {["open", "pending", "resolved", "closed"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {t.description ? (
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {t.organization_name ?? "Unknown org"} · {t.user_email ?? "unknown"} ·{" "}
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Item>
            ))}
          </Reveal>
        )
      ) : null}
    </div>
  );
}
