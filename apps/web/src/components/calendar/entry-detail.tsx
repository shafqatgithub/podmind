"use client";

/**
 * One planned episode, opened from the calendar.
 *
 * A month grid can only show a title and a status badge — enough to see that
 * a slot is filled, not enough to decide what to do about it. This is where
 * the slot becomes work: the whole plan for that episode in one place, and the
 * button that turns it into research, an outline and a script.
 *
 * Everything is editable here rather than in a separate form, because the
 * moment someone looks at a planned episode is the moment they realise the
 * date has to move or the title was wrong.
 */

import * as React from "react";
import Link from "next/link";
import { Sparkles, Trash2, User, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label, Select, Textarea, cn } from "@podmind/ui";
import {
  CALENDAR_STATUSES,
  type CalendarEntry,
  type CalendarStatus,
} from "@/lib/api/calendar";

const STATUS_STYLE: Record<CalendarStatus, string> = {
  planned: "bg-neutral-500/15 text-neutral-300",
  researching: "bg-primary-500/15 text-primary-300",
  recording: "bg-amber-500/15 text-amber-300",
  editing: "bg-purple-500/15 text-purple-300",
  published: "bg-success-500/15 text-success-300",
};

function formatFullDay(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function EntryDetail({
  entry,
  running,
  saving,
  onRun,
  onSave,
  onDelete,
  onClose,
}: {
  entry: CalendarEntry;
  running: boolean;
  saving: boolean;
  onRun: (entry: CalendarEntry) => void;
  onSave: (id: string, patch: Record<string, string>) => void;
  onDelete: (entry: CalendarEntry) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(entry.title);
  const [topic, setTopic] = React.useState(entry.topic ?? "");
  const [notes, setNotes] = React.useState(entry.notes ?? "");
  const [scheduledFor, setScheduledFor] = React.useState(entry.scheduled_for.slice(0, 10));

  // A different entry means a different set of fields; without this the panel
  // would keep showing the one opened before it.
  React.useEffect(() => {
    setEditing(false);
    setTitle(entry.title);
    setTopic(entry.topic ?? "");
    setNotes(entry.notes ?? "");
    setScheduledFor(entry.scheduled_for.slice(0, 10));
  }, [entry]);

  const save = () => {
    onSave(entry.id, {
      title,
      topic,
      notes,
      scheduled_for: scheduledFor,
    });
    setEditing(false);
  };

  return (
    <Card className="border-primary-500/30">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{formatFullDay(entry.scheduled_for)}</p>
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1"
                aria-label="Episode title"
              />
            ) : (
              <h2 className="mt-0.5 font-display text-lg font-semibold">{entry.title}</h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={STATUS_STYLE[entry.status]}>{entry.status}</Badge>
          {entry.guest_name ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" aria-hidden />
              {entry.guest_name}
            </span>
          ) : null}
          {entry.publish_at ? (
            <span className="text-xs text-muted-foreground">
              Publishes {formatFullDay(entry.publish_at)}
            </span>
          ) : null}
        </div>

        {editing ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-topic">What it covers</Label>
              <Textarea
                id="detail-topic"
                rows={2}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-notes">Notes</Label>
              <Textarea
                id="detail-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="detail-date">Recording date</Label>
              <Input
                id="detail-date"
                type="date"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} loading={saving}>
                Save changes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {entry.topic ? <p className="text-sm">{entry.topic}</p> : null}
            {entry.notes ? (
              <p className="whitespace-pre-line rounded-md border border-border/50 bg-hover/30 p-3 text-sm leading-snug text-muted-foreground">
                {entry.notes}
              </p>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
          {entry.agent_session_id ? (
            <>
              <Button asChild size="sm" variant="secondary">
                <Link href="/agents">View the run</Link>
              </Button>
              <span className="text-xs text-muted-foreground">
                {entry.agent_status === "completed"
                  ? "This episode has been made."
                  : `Pipeline ${entry.agent_status ?? "running"}`}
              </span>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => onRun(entry)} loading={running}>
                <Sparkles className="h-4 w-4" />
                Make this episode
              </Button>
              <span className="text-xs text-muted-foreground">
                Runs research, outline and script for this slot.
              </span>
            </>
          )}

          {!editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              Edit
            </Button>
          ) : null}

          <button
            type="button"
            onClick={() => onDelete(entry)}
            aria-label={`Remove ${entry.title}`}
            className={cn(
              "ml-auto rounded p-1.5 text-muted-foreground transition-colors",
              "hover:text-error-400",
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
