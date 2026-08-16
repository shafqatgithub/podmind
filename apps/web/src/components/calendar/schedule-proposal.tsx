"use client";

/**
 * The AI's proposed run of episodes, held for review.
 *
 * Nothing here exists in the calendar yet. That is the point: a generated
 * schedule written straight into someone's calendar is a chore to undo, and
 * the host is the one who knows which weeks they can actually record. So the
 * proposal arrives as a draft — every episode can be edited, dropped or
 * rescheduled, and only what survives gets saved.
 *
 * Dates come from the server's cadence arithmetic rather than the model, so
 * they are exact; the host can still move any single one.
 */

import * as React from "react";
import { CalendarPlus, Check, Trash2, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Textarea, cn } from "@podmind/ui";
import type { ScheduleProposal, SuggestedEpisode } from "@/lib/api/calendar";

const EFFORT_STYLE: Record<string, string> = {
  light: "bg-success-500/15 text-success-300",
  medium: "bg-amber-500/15 text-amber-300",
  heavy: "bg-error-500/15 text-error-300",
};

const FORMAT_LABEL: Record<string, string> = {
  solo: "Solo",
  interview: "Interview",
  deep_dive: "Deep dive",
  practical: "Practical",
  roundup: "Roundup",
};

function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function ScheduleProposalReview({
  proposal,
  saving,
  onApprove,
  onDiscard,
}: {
  proposal: ScheduleProposal;
  saving: boolean;
  onApprove: (episodes: SuggestedEpisode[]) => void;
  onDiscard: () => void;
}) {
  const [episodes, setEpisodes] = React.useState<SuggestedEpisode[]>(proposal.episodes);
  const [editing, setEditing] = React.useState<number | null>(null);

  const update = (index: number, patch: Partial<SuggestedEpisode>) => {
    setEpisodes((all) => all.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const drop = (index: number) => {
    setEpisodes((all) => all.filter((_, i) => i !== index));
    setEditing(null);
  };

  return (
    <Card className="border-primary-500/30">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-semibold">
              A plan for your next {episodes.length}{" "}
              {episodes.length === 1 ? "episode" : "episodes"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Nothing is saved yet — change what you want, then add it to the calendar.
            </p>
          </div>
          <Badge className="bg-neutral-500/15 text-neutral-300">
            {proposal.cadence} · from {formatDay(proposal.start_date)}
          </Badge>
        </div>

        {proposal.arc ? (
          <p className="rounded-md border border-border/50 bg-hover/30 p-3 text-sm leading-snug">
            {proposal.arc}
          </p>
        ) : null}

        <ul className="flex flex-col gap-2">
          {episodes.map((episode, index) => (
            <li key={index}>
              <div
                className={cn(
                  "rounded-lg border border-border/60 p-3 transition-colors",
                  editing === index && "border-primary-500/50",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDay(episode.scheduled_for)}
                  </span>

                  <div className="min-w-0 flex-1">
                    {editing === index ? (
                      <div className="flex flex-col gap-2">
                        <Input
                          value={episode.title}
                          onChange={(e) => update(index, { title: e.target.value })}
                          aria-label="Episode title"
                        />
                        <Textarea
                          rows={2}
                          value={episode.topic ?? ""}
                          onChange={(e) => update(index, { topic: e.target.value })}
                          aria-label="What it covers"
                        />
                        <Input
                          type="date"
                          value={episode.scheduled_for}
                          onChange={(e) => update(index, { scheduled_for: e.target.value })}
                          aria-label="Recording date"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium">{episode.title}</p>
                        {episode.topic ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">{episode.topic}</p>
                        ) : null}
                        {episode.angle ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="text-primary-300">Why now — </span>
                            {episode.angle}
                          </p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {episode.format ? (
                            <Badge className="bg-neutral-500/15 text-neutral-300">
                              {FORMAT_LABEL[episode.format] ?? episode.format}
                            </Badge>
                          ) : null}
                          {episode.effort ? (
                            <Badge
                              className={
                                EFFORT_STYLE[episode.effort] ?? "bg-neutral-500/15 text-neutral-300"
                              }
                            >
                              {episode.effort} prep
                            </Badge>
                          ) : null}
                          {episode.guest_suggestion ? (
                            <span className="text-xs text-muted-foreground">
                              Guest: {episode.guest_suggestion}
                            </span>
                          ) : null}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(editing === index ? null : index)}
                      aria-label={editing === index ? "Done editing" : "Edit this episode"}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {editing === index ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">Edit</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => drop(index)}
                      aria-label={`Remove ${episode.title}`}
                      className="rounded p-1.5 text-muted-foreground transition-colors hover:text-error-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {proposal.cautions.length ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="mb-1 text-xs font-medium text-amber-300">Worth knowing</p>
            <ul className="flex flex-col gap-1">
              {proposal.cautions.map((caution, i) => (
                <li key={i} className="text-xs leading-snug text-muted-foreground">
                  {caution}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onApprove(episodes)}
            loading={saving}
            disabled={episodes.length === 0}
          >
            <CalendarPlus className="h-4 w-4" />
            Add {episodes.length} to calendar
          </Button>
          <Button variant="ghost" onClick={onDiscard} disabled={saving}>
            <X className="h-4 w-4" />
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
