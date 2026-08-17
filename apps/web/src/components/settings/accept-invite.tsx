"use client";

/**
 * Accepting an invitation.
 *
 * Signed-in on purpose. The invitation is bound to one email address, and
 * checking that means knowing who is holding the link — an invite that works
 * for whoever opens it is not an invitation, it is a public door.
 *
 * The mismatch case is the one worth getting right: someone signed into their
 * personal account, opening a link sent to their work address, needs to be
 * told exactly that rather than "access denied".
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, Eye, EyeOff, Loader2, Users } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { apiRequest, ApiError } from "@/lib/api/client";
import { organizationApi } from "@/lib/api/organization";
import { createClient } from "@/lib/supabase/client";

interface Preview {
  organization: string;
  invited_by: string | null;
  email: string;
  role: string;
}

export function AcceptInvite() {
  const token = useSearchParams().get("token");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [joined, setJoined] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);
  /** undefined until checked; null when nobody is signed in. */
  const [signedInAs, setSignedInAs] = React.useState<string | null | undefined>(undefined);
  const [password, setPassword] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // An invite link is opened from email, usually on a device that is not
  // signed in. Without this the page offered an Accept button that could only
  // fail, and reported the failure as "Missing bearer token" — a message
  // about tokens to someone who was simply not logged in.
  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setSignedInAs(null);
      return;
    }
    void supabase.auth
      .getSession()
      .then(({ data }) => setSignedInAs(data.session?.user.email ?? null))
      .catch(() => setSignedInAs(null));
  }, []);

  React.useEffect(() => {
    if (!token) {
      setError("This link is missing its code. Ask for a new invitation.");
      return;
    }
    void apiRequest<Preview>("/organization/invitations/preview", { query: { token } })
      .then(setPreview)
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError && err.message
            ? err.message
            : "This invitation could not be opened.",
        );
      });
  }, [token]);

  /**
   * Create the account, sign in with it, then accept — in that order.
   *
   * Membership is recorded against a real session rather than trusted from an
   * unauthenticated call, so the same check applies to someone joining as to
   * someone who was already signed in.
   */
  const registerAndJoin = async () => {
    if (!token || !preview) return;
    setAccepting(true);
    setError(null);
    try {
      await organizationApi.registerFromInvite({
        token,
        password,
        ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
      });

      const supabase = createClient();
      const signIn = await supabase?.auth.signInWithPassword({
        email: preview.email,
        password,
      });
      if (signIn?.error) {
        setError("Your account was created — please sign in to finish joining.");
        return;
      }

      await apiRequest("/organization/invitations/accept", { method: "POST", body: { token } });
      setJoined(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : "The account could not be created. Try again.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const accept = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);
    try {
      await apiRequest("/organization/invitations/accept", { method: "POST", body: { token } });
      setJoined(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.message ? err.message : "The invitation could not be accepted.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const inviteHref = `/invite?token=${token ?? ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {joined ? (
            <>
              <Users className="h-8 w-8 text-success-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">You&rsquo;re in</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&rsquo;ve joined {preview?.organization ?? "the organization"}.
                </p>
              </div>
              <Button asChild>
                <Link href="/dashboard">Open PodMind</Link>
              </Button>
            </>
          ) : error && !preview ? (
            <>
              <CircleAlert className="h-8 w-8 text-amber-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">Invitation unavailable</h1>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button asChild variant="secondary">
                <Link href="/dashboard">Go to PodMind</Link>
              </Button>
            </>
          ) : !preview ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Opening your invitation…</p>
            </>
          ) : (
            <>
              <Users className="h-8 w-8 text-primary-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">
                  Join {preview.organization}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview.invited_by ? `${preview.invited_by} invited you` : "You've been invited"}{" "}
                  to work on podcasts together.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge className="bg-primary-500/15 capitalize text-primary-300">
                    {preview.role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{preview.email}</span>
                </div>
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              {signedInAs === undefined ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
              ) : signedInAs === null ? (
                <div className="flex w-full flex-col gap-3 text-left">
                  {/* Set a password and join, here. Opening this link already
                      proved they hold the inbox, so sending them off to sign
                      up — retyping the address, waiting for a second email,
                      entering a code — asks for that proof twice. */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input id="invite-email" value={preview.email} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      The invitation is for this address, so it can&rsquo;t be changed.
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invite-name">Your name</Label>
                    <Input
                      id="invite-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="How your teammates will see you"
                      maxLength={200}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="invite-password">Choose a password</Label>
                    <div className="relative">
                      <Input
                        id="invite-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={8}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                  </div>

                  <Button
                    onClick={() => void registerAndJoin()}
                    loading={accepting}
                    disabled={password.length < 8}
                  >
                    Create account and join
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      href={`/login?next=${encodeURIComponent(inviteHref)}`}
                      className="text-primary-400 hover:text-primary-300"
                    >
                      Sign in instead
                    </Link>
                  </p>
                </div>
              ) : signedInAs.toLowerCase() !== preview.email.toLowerCase() ? (
                <>
                  <p className="text-sm text-amber-300">
                    You&rsquo;re signed in as {signedInAs}, but this invitation was sent to{" "}
                    {preview.email}.
                  </p>
                  <Button asChild variant="secondary">
                    <Link href={`/login?next=${encodeURIComponent(inviteHref)}`}>
                      Switch account
                    </Link>
                  </Button>
                </>
              ) : (
                <Button onClick={() => void accept()} loading={accepting}>
                  Accept invitation
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
