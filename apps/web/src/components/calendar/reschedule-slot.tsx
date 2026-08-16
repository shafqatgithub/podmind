"use client";

/**
 * Landing page for the "pick another date" link in a reminder email.
 *
 * A date picker rather than a reply-with-dates flow. Parsing dates out of
 * free-text email replies means guessing at "next Tues", "the 3rd" and
 * "sometime after Eid" — and a guess that lands on the wrong day silently
 * moves someone's recording. One tap on a calendar is unambiguous, works on a
 * phone, and confirms itself immediately.
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarCheck, CircleAlert, Loader2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { apiRequest } from "@/lib/api/client";

interface Preview {
  title: string;
  scheduled_for: string;
  project_title: string;
  already_used: boolean;
}

interface Rescheduled {
  rescheduled: boolean;
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

/** Tomorrow, as the earliest date worth offering. */
function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function RescheduleSlot() {
  const token = useSearchParams().get("token");
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [done, setDone] = React.useState<Rescheduled | null>(null);
  const [date, setDate] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setError("This link is missing its code. Open the calendar in PodMind instead.");
      return;
    }
    void apiRequest<Preview>("/calendar/actions/preview", {
      query: { token, purpose: "reschedule" },
    })
      .then((p) => {
        setPreview(p);
        // Seed with the current date so the picker opens on the right month.
        setDate(String(p.scheduled_for).slice(0, 10));
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error && err.message
            ? err.message
            : "This link could not be used. Open the calendar in PodMind instead.",
        );
      });
  }, [token]);

  const submit = async () => {
    if (!token || !date) return;
    setSaving(true);
    setError(null);
    try {
      setDone(
        await apiRequest<Rescheduled>("/calendar/actions/reschedule", {
          method: "POST",
          body: { token, scheduled_for: date },
        }),
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message ? err.message : "That date could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardContent className="flex flex-col gap-4 p-8">
          {done ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CalendarCheck className="h-8 w-8 text-success-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">Moved</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="text-foreground">{done.title}</span> is now on{" "}
                  {formatDay(done.scheduled_for)}.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your reminders have moved with it.
                </p>
              </div>
              <Button asChild>
                <Link href="/calendar">Open the calendar</Link>
              </Button>
            </div>
          ) : error && !preview ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <CircleAlert className="h-8 w-8 text-amber-400" aria-hidden />
              <div>
                <h1 className="font-display text-lg font-semibold">Couldn&rsquo;t open this</h1>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
              <Button asChild>
                <Link href="/calendar">Open the calendar</Link>
              </Button>
            </div>
          ) : !preview ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground">{preview.project_title}</p>
                <h1 className="mt-0.5 font-display text-lg font-semibold">{preview.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Currently {formatDay(preview.scheduled_for)}.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-date">Move it to</Label>
                <Input
                  id="new-date"
                  type="date"
                  min={tomorrow()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}

              <Button
                onClick={() => void submit()}
                loading={saving}
                disabled={!date || date === String(preview.scheduled_for).slice(0, 10)}
              >
                Move this episode
              </Button>
              <Button asChild variant="ghost">
                <Link href="/calendar">Open the calendar instead</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
