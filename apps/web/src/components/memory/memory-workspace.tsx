"use client";

/**
 * AI Memory workspace.
 *
 * This page is the honest answer to "what does the AI know about me?", so it
 * is built for auditing rather than collecting: everything stored is visible,
 * editable and deletable in one place, and importance is explained in plain
 * words rather than shown as a bare number the user has to guess at.
 */

import * as React from "react";
import { Brain, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { projectsApi, type Project } from "@/lib/api/projects";
import {
  MEMORY_TYPES,
  memoryApi,
  type Memory,
  type MemoryStats,
  type MemoryType,
} from "@/lib/api/memory";
import { EmptyState } from "@/components/common/empty-state";
import { Item, Reveal } from "@/components/motion/motion";

const TYPE_STYLES: Record<MemoryType, string> = {
  instruction: "bg-error-500/15 text-error-300",
  preference: "bg-primary-500/15 text-primary-300",
  fact: "bg-success-500/15 text-success-300",
  context: "bg-cyan-500/15 text-cyan-300",
  insight: "bg-purple-500/15 text-purple-300",
  summary: "bg-neutral-500/15 text-neutral-300",
};

/** Importance means nothing as a bare number, so it is described. */
function importanceLabel(value: number): string {
  if (value >= 9) return "Always applied";
  if (value >= 7) return "Strong";
  if (value >= 4) return "Normal";
  return "Background";
}

function MemoryForm({
  projects,
  initial,
  onSave,
  onCancel,
}: {
  projects: Project[];
  initial?: Memory;
  onSave: (body: {
    memory_type: MemoryType;
    title: string;
    content: string;
    project_id?: string;
    importance: number;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [type, setType] = React.useState<MemoryType>(initial?.memory_type ?? "preference");
  const [importance, setImportance] = React.useState(initial?.importance ?? 5);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();
    if (!title || !content) {
      setError("Give the memory a title and some content.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const projectId = String(form.get("project_id") ?? "");
      await onSave({
        memory_type: type,
        title,
        content,
        importance,
        ...(projectId ? { project_id: projectId } : {}),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const hint = MEMORY_TYPES.find((t) => t.value === type)?.hint;

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="memory_type">Type</Label>
              <Select
                id="memory_type"
                value={type}
                onChange={(e) => setType(e.target.value as MemoryType)}
              >
                {MEMORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="importance">
                Importance — {importanceLabel(importance)}
              </Label>
              <input
                id="importance"
                type="range"
                min={1}
                max={10}
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="h-10 w-full accent-primary-500"
              />
              <p className="text-xs text-muted-foreground">
                Higher importance means the AI applies it more insistently.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={initial?.title}
                maxLength={200}
                placeholder="Keep the cold open short"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="content">What should the AI remember?</Label>
              <Textarea
                id="content"
                name="content"
                rows={3}
                defaultValue={initial?.content}
                maxLength={5000}
                placeholder="Never open with a long intro — get to the first idea within 45 seconds."
                required
              />
            </div>

            {!initial ? (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="project_id">Apply to</Label>
                <Select id="project_id" name="project_id" defaultValue="">
                  <option value="">Everything I make</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Only: {p.title}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-error-400">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              <Check className="h-4 w-4" />
              {initial ? "Save changes" : "Add memory"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function MemoryWorkspace() {
  const [memories, setMemories] = React.useState<Memory[]>([]);
  const [stats, setStats] = React.useState<MemoryStats | null>(null);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Memory | null>(null);
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<"" | MemoryType>("");
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(
    async (signal?: AbortSignal) => {
      try {
        const result = await memoryApi.list(
          {
            ...(search ? { search } : {}),
            ...(typeFilter ? { memory_type: typeFilter } : {}),
          },
          signal,
        );
        setMemories(result.items);
        setStats(result.stats);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter],
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), search ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, search]);

  React.useEffect(() => {
    void (async () => {
      try {
        const page = await projectsApi.list({ limit: 100 });
        setProjects(page.items.filter((p) => !p.is_archived));
      } catch {
        /* project scoping is optional */
      }
    })();
  }, []);

  const remove = async (memory: Memory) => {
    if (!window.confirm(`Forget "${memory.title}"?`)) return;
    const snapshot = memories;
    setMemories((all) => all.filter((m) => m.id !== memory.id));
    try {
      await memoryApi.remove(memory.id);
      await load();
    } catch {
      setMemories(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={Brain}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to manage what the AI remembers."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {stats && stats.total > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {stats.total} {stats.total === 1 ? "memory" : "memories"}
          </span>
          {stats.by_type.map((t) => (
            <Badge key={t.memory_type} className={TYPE_STYLES[t.memory_type]}>
              {t.count} {t.memory_type}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search memories"
            aria-label="Search memories"
            className="pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | MemoryType)}
          aria-label="Filter by type"
          className="w-44"
        >
          <option value="">All types</option>
          {MEMORY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        <Button
          onClick={() => {
            setEditing(null);
            setCreating((v) => !v);
          }}
        >
          <Plus className="h-4 w-4" />
          Add memory
        </Button>
      </div>

      {creating ? (
        <MemoryForm
          projects={projects}
          onCancel={() => setCreating(false)}
          onSave={async (body) => {
            await memoryApi.create(body);
            setCreating(false);
            await load();
          }}
        />
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : null}

      {!loading && memories.length === 0 ? (
        <EmptyState
          icon={Brain}
          title={search || typeFilter ? "Nothing matches those filters" : "The AI remembers nothing yet"}
          description={
            search || typeFilter
              ? "Try a different search or clear the type filter."
              : "Add an instruction or preference and every module — research, scripts, chat — will follow it without being told again."
          }
        />
      ) : null}

      {memories.length > 0 ? (
        <Reveal className="flex flex-col gap-3">
          {memories.map((memory) =>
            editing?.id === memory.id ? (
              <Item key={memory.id}>
                <MemoryForm
                  projects={projects}
                  initial={memory}
                  onCancel={() => setEditing(null)}
                  onSave={async (body) => {
                    await memoryApi.update(memory.id, body);
                    setEditing(null);
                    await load();
                  }}
                />
              </Item>
            ) : (
              <Item key={memory.id}>
                <Card>
                  <CardContent className="flex items-start gap-3 p-5">
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn("capitalize", TYPE_STYLES[memory.memory_type])}>
                          {memory.memory_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {importanceLabel(memory.importance)}
                        </span>
                        {memory.project_id ? (
                          <Badge className="text-[10px]">Project only</Badge>
                        ) : null}
                        {memory.source && memory.source !== "user" ? (
                          <Badge className="bg-purple-500/15 text-[10px] text-purple-300">
                            Learned automatically
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="font-display font-semibold">{memory.title}</h3>
                      <p className="text-sm text-muted-foreground">{memory.content}</p>
                      {memory.access_count ? (
                        <p className="text-xs text-muted-foreground">
                          Used {memory.access_count} time{memory.access_count === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit memory: ${memory.title}`}
                        onClick={() => {
                          setCreating(false);
                          setEditing(memory);
                        }}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Forget memory: ${memory.title}`}
                        onClick={() => void remove(memory)}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Item>
            ),
          )}
        </Reveal>
      ) : null}
    </div>
  );
}
