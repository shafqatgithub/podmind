"use client";

/**
 * Admin · Users.
 *
 * The one per-user operator surface: every account, the organization it
 * belongs to, its plan, credit balance and status — with the controls an
 * operator actually needs (grant or deduct credits, disable an account,
 * remove someone from an org). Credits are held per organization, so a credit
 * change here moves the whole org's balance, not one person's.
 */

import * as React from "react";
import { Ban, Check, Coins, Loader2, Search, ShieldAlert, UserMinus, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { adminApi, type AdminUser } from "@/lib/api/admin";
import { AdminUserDetail } from "@/components/admin/admin-user-detail";
import { EmptyState } from "@/components/common/empty-state";

function planTone(plan: string | null): string {
  switch (plan) {
    case "pro":
    case "business":
    case "enterprise":
      return "text-primary-300";
    case "starter":
      return "text-foreground";
    default:
      return "text-muted-foreground";
  }
}

export function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [amounts, setAmounts] = React.useState<Record<string, string>>({});
  const [detailId, setDetailId] = React.useState<string | null>(null);

  const load = React.useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.users({ search: q, limit: 100 });
      setUsers(res.items);
      setTotal(res.total);
    } catch (e) {
      if (e instanceof ApiError && e.code === "FORBIDDEN") {
        setError("not-admin");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Could not load users.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search.
  React.useEffect(() => {
    const t = setTimeout(() => void load(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const run = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      flash(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  };

  const adjust = (u: AdminUser, sign: 1 | -1) =>
    run(u.id, async () => {
      if (!u.organization_id) {
        flash("This user has no organization to credit.");
        return;
      }
      const raw = Number(amounts[u.id]);
      if (!Number.isFinite(raw) || raw <= 0) {
        flash("Enter a credit amount first.");
        return;
      }
      const res = await adminApi.adjustCredits(u.organization_id, sign * Math.floor(raw));
      setUsers((prev) =>
        prev.map((x) =>
          x.organization_id === u.organization_id
            ? { ...x, available_credits: res.available_credits }
            : x,
        ),
      );
      setAmounts((prev) => ({ ...prev, [u.id]: "" }));
      flash(
        `${sign > 0 ? "Granted" : "Deducted"} ${Math.floor(raw)} credits · ${u.organization_name ?? "org"} now at ${res.available_credits}.`,
      );
    });

  const toggleAccess = (u: AdminUser) =>
    run(u.id, async () => {
      const next = !u.is_active;
      if (!next && !window.confirm(`Disable ${u.email}? They will be signed out and blocked from signing in.`)) {
        return;
      }
      await adminApi.setUserAccess(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: next } : x)));
      flash(`${u.email} ${next ? "enabled" : "disabled"}.`);
    });

  const removeFromOrg = (u: AdminUser) =>
    run(u.id, async () => {
      if (!u.organization_id) return;
      if (!window.confirm(`Remove ${u.email} from ${u.organization_name ?? "their organization"}?`)) {
        return;
      }
      await adminApi.removeMember(u.organization_id, u.id);
      flash(`${u.email} removed from ${u.organization_name ?? "org"}.`);
      void load(search.trim());
    });

  if (!isApiConfigured()) {
    return <EmptyState icon={ShieldAlert} title="Admin unavailable" description="The API URL is not configured." />;
  }

  if (error === "not-admin") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Not available"
        description="This account does not have administrator access."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, name or organization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          {loading ? "…" : `${total} user${total === 1 ? "" : "s"}`}
        </span>
      </div>

      {notice ? (
        <div
          role="status"
          className="rounded-md border border-primary-500/30 bg-primary-500/5 px-3 py-2 text-sm text-primary-200"
        >
          {notice}
        </div>
      ) : null}

      {error && error !== "not-admin" ? (
        <div className="rounded-md border border-error-500/30 bg-error-500/5 px-3 py-2 text-sm text-error-300">
          {error}
        </div>
      ) : null}

      {loading && users.length === 0 ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading users…
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users" description="Nothing matches that search." />
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const busy = busyId === u.id;
            return (
              <Card key={u.id} className={cn(!u.is_active && "opacity-70")}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{u.full_name || u.email}</span>
                        {u.is_owner ? <Badge variant="neutral">Owner</Badge> : null}
                        {!u.is_active ? <Badge variant="error">Disabled</Badge> : null}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{u.organization_name ?? "No organization"}</span>
                        {u.org_role ? <span>· {u.org_role}</span> : null}
                        <span className={planTone(u.plan)}>· {u.plan ?? "free"}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <Coins className="size-3.5 text-muted-foreground" />
                        {u.available_credits.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {u.used_credits.toLocaleString()} used
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      placeholder="Credits"
                      value={amounts[u.id] ?? ""}
                      onChange={(e) => setAmounts((p) => ({ ...p, [u.id]: e.target.value }))}
                      className="h-8 w-24"
                      disabled={busy || !u.organization_id}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || !u.organization_id}
                      onClick={() => void adjust(u, 1)}
                    >
                      Grant
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || !u.organization_id}
                      onClick={() => void adjust(u, -1)}
                    >
                      Deduct
                    </Button>

                    <div className="ml-auto flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => setDetailId(u.id)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant={u.is_active ? "secondary" : "primary"}
                        disabled={busy}
                        onClick={() => void toggleAccess(u)}
                      >
                        {u.is_active ? (
                          <>
                            <Ban className="mr-1 size-3.5" /> Disable
                          </>
                        ) : (
                          <>
                            <Check className="mr-1 size-3.5" /> Enable
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-error-400 hover:text-error-300"
                        disabled={busy || u.is_owner || !u.organization_id}
                        onClick={() => void removeFromOrg(u)}
                        title={u.is_owner ? "Owners cannot be removed" : "Remove from organization"}
                      >
                        <UserMinus className="mr-1 size-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {detailId ? (
        <AdminUserDetail
          userId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => void load(search.trim())}
        />
      ) : null}
    </div>
  );
}
