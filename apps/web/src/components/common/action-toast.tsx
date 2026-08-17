"use client";

/**
 * A brief message that appears over the page, near the bottom.
 *
 * Workspaces show their errors beside the generate form at the top, which
 * works for a failed generation and not at all for a refused delete: the
 * lists sit at the bottom, so the row vanished, reappeared, and the
 * explanation was a screen away. People read that as the app losing their
 * request.
 *
 * Fixed position rather than inline, because the alternative is threading an
 * error slot into every list in every workspace and keeping them in step.
 * It dismisses itself, since nothing here needs acting on — it is telling you
 * why something did not happen.
 */

import * as React from "react";
import { CircleAlert, X } from "lucide-react";
import { cn } from "@podmind/ui";

/** Long enough to read a sentence, short enough not to sit in the way. */
const VISIBLE_MS = 6000;

export function ActionToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3",
        "rounded-lg border border-error-500/40 bg-card/95 p-3 shadow-soft backdrop-blur-[20px]",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error-400" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug text-foreground">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
