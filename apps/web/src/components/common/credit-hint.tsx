"use client";

/**
 * The credit hint shown beside a generate button.
 *
 * Each workspace used to hard-code its own number — "Uses 5 AI credits" next
 * to Build outline, "Uses 10" next to research, and so on. Those numbers were
 * true when billing was a flat per-task rate; once spend became metered
 * against real provider cost they became wrong, and a wrong number here is
 * worse than none: it is the figure someone budgets against.
 *
 * So the estimate comes from the API's own task table, which is derived from
 * the same constants the router bills with, and it is phrased as an estimate
 * because that is what it is. When the status call has not arrived — or the
 * task is unknown to it — nothing is shown rather than a guess.
 */

import type { AiStatus } from "@/lib/api/ai";

export function CreditHint({
  status,
  task,
  suffix,
}: {
  status: AiStatus | null;
  /** Task key as reported by the API, e.g. "outline". */
  task: string;
  /** Appended after the estimate, e.g. "a full script takes 1–2 minutes". */
  suffix?: string;
}) {
  const entry = status?.tasks.find((t) => t.task === task);

  return (
    <span className="text-xs text-muted-foreground">
      {entry
        ? `About ${entry.credits} credits — you are charged for what the run actually uses${
            suffix ? ` · ${suffix}` : ""
          }`
        : suffix}
    </span>
  );
}
