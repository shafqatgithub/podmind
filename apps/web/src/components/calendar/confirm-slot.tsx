"use client";

/**
 * Landing page for the "confirm this date" link in a reminder email.
 *
 * Deliberately outside the signed-in app: the token in the URL is the
 * credential, so this works on whatever device happens to be showing the
 * email. Asking someone to log in first is how a one-tap confirmation turns
 * into something they mean to do later and never do.
 *
 * It confirms on load rather than showing another button. The host already
 * pressed a button — in the email — and making them press a second one that
 * says the same thing is asking twice.
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CircleAlert, Loader2 } from "lucide-react";
import { Button, Card, CardContent } from "@podmind/ui";
import { apiRequest } from "@/lib/api/client";

interface Confirmed {
  confirmed: boolean;
  title: string;
  scheduled_for: string;
  project_title: string;
}

function formatDay(iso: string): string {
  const date = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function ConfirmSlot() {
  const token = useSearchParams().get("token");
  const [result, setResult] = React.useState<Confirmed | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const done = React.useRef(false);

  React.useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (!token) {
      setError("This link is missing its code. Open the calendar in PodMind instead.");
      return;
    }

    void apiRequest<Confirmed>("/calendar/actions/confirm", {
      method: "POST",
      body: { token },
    })
      .then(setResult)
      .catch((err: unknown) => {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "This link could not be used. Open the calendar in PodMind instead.",
        );
      });
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {!result && !error ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Confirming your slot…</p>
            </>
          ) : error ? (
            <>
              <CircleAlert className="h-8 w-8 text-amber-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">Couldn&rsquo;t confirm</h1>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button asChild>
                <Link href="/calendar">Open the calendar</Link>
              </Button>
            </>
          ) : (
            <>
              <CalendarCheck className="h-8 w-8 text-success-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">You&rsquo;re booked in</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-foreground">{result!.title}</span> stays on{" "}
                  {formatDay(result!.scheduled_for)}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  We&rsquo;ll send one last reminder the day before.
                </p>
              </div>
              <Button asChild>
                <Link href="/calendar">Open the calendar</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
