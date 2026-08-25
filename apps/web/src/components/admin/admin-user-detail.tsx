"use client";

/**
 * Admin · user detail drawer.
 *
 * Opens over the user list and answers "who is this and what have they done":
 * their organizations and role, how their organization has used AI (by task,
 * with tokens and cost), recent requests, sign-in history and credit
 * movements — plus the destructive controls (remove from an org, delete the
 * account) that only make sense with the full picture in view.
 */

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { Badge, Button, cn } from "@podmind/ui";
import { ApiError } from "@/lib/api/client";
import { adminApi, type AdminUserDetail as Detail } from "@/lib/api/admin";

function when(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function AdminUserDetail({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = React.useState<Detail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .user(userId)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e instanceof ApiError ? e.message : "Could not load user."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId]);

  const flash = (m: string) => {
    setNotice(m);
    setTimeout(() => setNotice(null), 3500);
  };

  const removeFromOrg = async (orgId: string, orgName: string) => {
    if (!window.confirm(`Remove this user from ${orgName}?`)) return;
    setBusy(true);
    try {
      await adminApi.removeMember(orgId, userId);
      setData((d) =>
        d ? { ...d, memberships: d.memberships.filter((m) => m.organization_id !== orgId) } : d,
      );
      onChanged();
      flash(`Removed from ${orgName}.`);
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Could not remove.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async () => {
    if (
      !window.confirm(
        "Permanently delete this user and their personal workspace? This cannot be undone.",
      )
    )
      return;
    setBusy(true);
    try {
      await adminApi.deleteUser(userId);
      onChanged();
      onClose();
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Could not delete this user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-background shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <h2 className="font-display text-lg font-semibold">User detail</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        {notice ? (
          <div className="mx-5 mt-4 rounded-md border border-primary-500/30 bg-primary-500/5 px-3 py-2 text-sm text-primary-200">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-error-400">{error}</div>
        ) : data ? (
          <div className="flex flex-col gap-6 p-5">
            {/* Identity */}
            <section>
              <div className="flex items-center gap-2">
                <span className="font-medium">{data.profile.full_name || data.profile.email}</span>
                {!data.profile.is_active ? <Badge variant="error">Disabled</Badge> : null}
              </div>
              <div className="text-sm text-muted-foreground">{data.profile.email}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Joined {when(data.profile.created_at)} · Last login {when(data.profile.last_login_at)}
              </div>
            </section>

            {/* Memberships */}
            <Section title="Organizations">
              {data.memberships.length === 0 ? (
                <Empty>No organization membership.</Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {data.memberships.map((m) => (
                    <div
                      key={m.organization_id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{m.organization_name}</span>{" "}
                        <span className="text-muted-foreground">· {m.role}</span>
                      </div>
                      {m.is_owner ? (
                        <Badge variant="neutral">Owner</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-error-400 hover:text-error-300"
                          disabled={busy}
                          onClick={() => void removeFromOrg(m.organization_id, m.organization_name)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Usage by task */}
            <Section title="AI usage by task" hint="Tracked per organization">
              {data.usage_by_task.length === 0 ? (
                <Empty>No AI usage yet.</Empty>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1">Task</th>
                      <th className="py-1 text-right">Requests</th>
                      <th className="py-1 text-right">Failures</th>
                      <th className="py-1 text-right">Tokens</th>
                      <th className="py-1 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usage_by_task.map((u) => (
                      <tr key={u.task} className="border-t border-border">
                        <td className="py-1.5">{u.task}</td>
                        <td className="py-1.5 text-right">{u.requests}</td>
                        <td className="py-1.5 text-right">{u.failures}</td>
                        <td className="py-1.5 text-right">{Number(u.tokens).toLocaleString()}</td>
                        <td className="py-1.5 text-right">${Number(u.cost).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            {/* Recent requests */}
            <Section title="Recent AI requests">
              {data.recent_requests.length === 0 ? (
                <Empty>Nothing yet.</Empty>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {data.recent_requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            r.success === false ? "bg-error-500" : "bg-success-500",
                          )}
                        />
                        {r.task}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Number(r.total_tokens ?? 0).toLocaleString()} tok · $
                        {Number(r.estimated_cost ?? 0).toFixed(4)} · {when(r.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Logins */}
            <Section title="Recent sign-ins">
              {data.recent_logins.length === 0 ? (
                <Empty>No sign-in history.</Empty>
              ) : (
                <div className="flex flex-col gap-1.5 text-sm">
                  {data.recent_logins.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {[l.city, l.country].filter(Boolean).join(", ") || l.ip_address || "Unknown"}
                        {l.browser ? ` · ${l.browser}` : ""}
                        {l.operating_system ? ` · ${l.operating_system}` : ""}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{when(l.login_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Credit history */}
            <Section title="Credit history" hint="Per organization">
              {data.credit_transactions.length === 0 ? (
                <Empty>No credit movements.</Empty>
              ) : (
                <div className="flex flex-col gap-1.5 text-sm">
                  {data.credit_transactions.map((t, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {t.description || t.transaction_type}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          Number(t.amount) >= 0 ? "text-success-400" : "text-error-400",
                        )}
                      >
                        {Number(t.amount) >= 0 ? "+" : ""}
                        {Number(t.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Danger zone */}
            <section className="rounded-md border border-error-500/30 bg-error-500/5 p-4">
              <h3 className="text-sm font-semibold text-error-300">Delete user</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Permanently removes the account and its personal workspace. Blocked if the user owns
                an organization with other members or content — disable them instead.
              </p>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3"
                loading={busy}
                onClick={() => void deleteUser()}
              >
                Delete this user
              </Button>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
