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
import { CircleAlert, Loader2, Users } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@podmind/ui";
import { apiRequest, ApiError } from "@/lib/api/client";

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

              <Button onClick={() => void accept()} loading={accepting}>
                Accept invitation
              </Button>
              <p className="text-xs text-muted-foreground">
                Sign in as {preview.email} if you aren&rsquo;t already.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
