"use client";

/**
 * Who is in this organization, and inviting more.
 *
 * Two ways to invite, because email is not reliable enough to be the only
 * one: send it, or copy the link and pass it on however you like. Both go to
 * the same single-use, email-bound token, so copying it is not a loophole —
 * the person opening it still has to be signed in as the invited address.
 *
 * Roles are shown with what they mean rather than just their name. "Manager"
 * tells nobody anything; "create and edit all content, cannot manage members"
 * is the decision the person is actually making.
 */

import * as React from "react";
import { Check, Copy, Mail, Trash2, UserPlus } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label, Select, cn } from "@podmind/ui";
import { ApiError } from "@/lib/api/client";
import {
  ORGANIZATION_ROLES,
  organizationApi,
  ROLE_DESCRIPTIONS,
  type OrganizationInvitation,
  type OrganizationMember,
  type OrganizationRole,
} from "@/lib/api/organization";

const ROLE_STYLE: Record<string, string> = {
  owner: "bg-primary-500/15 text-primary-300",
  admin: "bg-purple-500/15 text-purple-300",
  manager: "bg-amber-500/15 text-amber-300",
  member: "bg-neutral-500/15 text-neutral-300",
  viewer: "bg-neutral-500/15 text-neutral-400",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function MembersPanel() {
  const [members, setMembers] = React.useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = React.useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  /** The link from the most recent invite, offered for copying. */
  const [lastLink, setLastLink] = React.useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const load = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await organizationApi.members(signal);
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof ApiError ? err.message : "Could not load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const invite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Captured now: React clears `currentTarget` once the handler awaits, and
    // reaching for it afterwards threw — inside the try, so a perfectly
    // successful invitation reported itself as a failure.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const email = String(form.get("email") ?? "").trim();
    const role = String(form.get("role") ?? "member") as OrganizationRole;
    if (!email) return;

    setInviting(true);
    setError(null);
    try {
      const result = await organizationApi.invite({ email, role });
      setLastLink({ email: result.email, url: result.invite_url });
      setCopied(false);
      formElement.reset();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send that invitation.");
    } finally {
      setInviting(false);
    }
  };

  const act = async (id: string, work: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await work();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That didn't work.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <h2 className="font-display font-semibold">Team</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite people to work on your podcasts together.
          </p>
        </div>

        <form onSubmit={invite} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-role">Access</Label>
              <Select id="invite-role" name="role" defaultValue="member">
                {ORGANIZATION_ROLES.map((role) => (
                  <option key={role} value={role} className="capitalize">
                    {role}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={inviting}>
                <UserPlus className="h-4 w-4" />
                Invite
              </Button>
            </div>
          </div>
          <ul className="flex flex-col gap-0.5">
            {ORGANIZATION_ROLES.map((role) => (
              <li key={role} className="text-xs text-muted-foreground">
                <span className="capitalize text-foreground">{role}</span> —{" "}
                {ROLE_DESCRIPTIONS[role]}
              </li>
            ))}
          </ul>
        </form>

        {lastLink ? (
          <div className="flex flex-col gap-2 rounded-lg border border-success-500/30 bg-success-500/5 p-3">
            <p className="text-sm">
              Invitation sent to{" "}
              <span className="text-foreground">{lastLink.email}</span>.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={lastLink.url} className="text-xs" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(lastLink.url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only {lastLink.email} can use this link, so it&rsquo;s safe to send however you
              like.
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-error-400">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Members ({members.length})
          </p>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.full_name ?? member.email}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>

                  {member.is_owner ? (
                    <Badge className={ROLE_STYLE.owner}>Owner</Badge>
                  ) : (
                    <>
                      <Select
                        value={member.role}
                        disabled={busy === member.id}
                        aria-label={`Role for ${member.email}`}
                        className="h-8 w-auto text-xs"
                        onChange={(e) =>
                          void act(member.id, () =>
                            organizationApi.updateRole(
                              member.id,
                              e.target.value as OrganizationRole,
                            ),
                          )
                        }
                      >
                        {ORGANIZATION_ROLES.map((role) => (
                          <option key={role} value={role} className="capitalize">
                            {role}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        disabled={busy === member.id}
                        onClick={() => {
                          if (!window.confirm(`Remove ${member.email} from this organization?`)) {
                            return;
                          }
                          void act(member.id, () => organizationApi.removeMember(member.id));
                        }}
                        aria-label={`Remove ${member.email}`}
                        className={cn(
                          "rounded p-1.5 text-muted-foreground transition-colors",
                          "hover:text-error-400 disabled:opacity-50",
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {invitations.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pending invitations ({invitations.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/60 p-3"
                >
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invitation.expires_at)}
                    </p>
                  </div>
                  <Badge className={ROLE_STYLE[invitation.role] ?? ROLE_STYLE.member}>
                    {invitation.role}
                  </Badge>
                  <button
                    type="button"
                    disabled={busy === invitation.id}
                    onClick={() =>
                      void act(invitation.id, () => organizationApi.revokeInvite(invitation.id))
                    }
                    aria-label={`Cancel invitation to ${invitation.email}`}
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:text-error-400 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
