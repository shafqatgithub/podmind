"use client";

/**
 * What a user sees when they run out of credits mid-task.
 *
 * The previous message was a single line — "You are out of AI credits." — which
 * states the problem and offers nothing. Someone hitting it has to work out on
 * their own whether they can buy more, whether upgrading helps, or whether
 * waiting is enough. This puts those three answers in front of them, because a
 * blocked user with no next step is the point at which they give up on the
 * product rather than on the task.
 *
 * The renewal date is only shown when it is known: inventing "renews soon"
 * would be worse than saying nothing.
 */

import Link from "next/link";
import { CreditCard, Sparkles } from "lucide-react";
import { Button } from "@podmind/ui";
import { ApiError } from "@/lib/api/client";

/** True when a failure was caused by an empty balance rather than a fault. */
export function isOutOfCredits(err: unknown): boolean {
  return err instanceof ApiError && err.code === "INSUFFICIENT_CREDITS";
}

/** How many credits the run needed, when the API said so. */
export function requiredCredits(err: unknown): number | null {
  if (!(err instanceof ApiError)) return null;
  const value = err.details?.required;
  return typeof value === "number" ? value : null;
}

function formatRenewal(renewsAt: string | null | undefined): string | null {
  if (!renewsAt) return null;
  const date = new Date(renewsAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long" });
}

export function OutOfCreditsNotice({
  /** How many credits the attempted run needed, when the API reported it. */
  required,
  /** ISO date the current plan's allowance resets, if known. */
  renewsAt,
  /** Shown above the actions; defaults to a neutral description. */
  action = "this run",
}: {
  required?: number | null;
  renewsAt?: string | null;
  action?: string;
}) {
  const renewal = formatRenewal(renewsAt);

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">You&rsquo;re out of AI credits</p>
        <p className="text-sm leading-snug text-muted-foreground">
          {required
            ? `${action.charAt(0).toUpperCase()}${action.slice(1)} needs about ${required} credits and your balance is empty.`
            : `There aren't enough credits left for ${action}.`}{" "}
          {renewal
            ? `Your plan's credits renew on ${renewal} — or top up now to carry on.`
            : "Top up or move to a larger plan to carry on."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link href="/billing">
            <CreditCard className="h-4 w-4" />
            Buy credits
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/billing">
            <Sparkles className="h-4 w-4" />
            Upgrade plan
          </Link>
        </Button>
        {renewal ? (
          <span className="text-xs text-muted-foreground">or wait until {renewal}</span>
        ) : null}
      </div>
    </div>
  );
}
