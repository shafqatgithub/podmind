"use client";

/**
 * Projects workspace — the first module backed by the live API.
 *
 * State is deliberately local (no data-fetching library yet): one loader,
 * one error surface, optimistic updates for the two cheap mutations
 * (favorite, archive) and a refetch for the rest. When the API URL is not
 * configured or unreachable, the UI explains that instead of showing a
 * broken empty state.
 */

import * as React from "react";
import {
  Archive,
  FolderKanban,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
} from "lucide-react";
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
import {
  LANGUAGES,
  PROJECT_STATUSES,
  PROJECT_VISIBILITIES,
  projectsApi,
  type CreateProjectInput,
  type Project,
  type ProjectStatus,
} from "@/lib/api/projects";
import { EmptyState } from "@/components/common/empty-state";
import { Item, LiftCard, Reveal } from "@/components/motion/motion";

/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft: "bg-neutral-500/15 text-neutral-300",
  research: "bg-purple-500/15 text-purple-300",
  outline: "bg-cyan-500/15 text-cyan-300",
  writing: "bg-primary-500/15 text-primary-300",
  review: "bg-warning-500/15 text-warning-300",
  published: "bg-success-500/15 text-success-300",
  archived: "bg-neutral-600/15 text-neutral-400",
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge className={cn("capitalize", STATUS_STYLES[status])}>{status}</Badge>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ------------------------------------------------------------- create */

function CreateProjectForm({
  onCreated,
  onCancel,
}: {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) {
      setError("Give the project a title.");
      return;
    }

    const body: CreateProjectInput = { title };
    for (const key of ["description", "category", "niche", "audience", "podcast_name"] as const) {
      const value = String(form.get(key) ?? "").trim();
      if (value) body[key] = value;
    }
    body.status = String(form.get("status") ?? "draft") as CreateProjectInput["status"];
    body.visibility = String(
      form.get("visibility") ?? "private",
    ) as CreateProjectInput["visibility"];
    body.language = String(form.get("language") ?? "en") as CreateProjectInput["language"];

    setPending(true);
    setError(null);
    try {
      onCreated(await projectsApi.create(body));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the project. Try again.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="title">Project title</Label>
              <Input
                id="title"
                name="title"
                placeholder="The Future of AI Agents"
                maxLength={200}
                autoFocus
                required
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                maxLength={5000}
                placeholder="What is this episode about?"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="podcast_name">Podcast name</Label>
              <Input id="podcast_name" name="podcast_name" maxLength={200} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" maxLength={120} placeholder="Technology" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="niche">Niche</Label>
              <Input id="niche" name="niche" maxLength={120} placeholder="AI tooling" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="audience">Audience</Label>
              <Input
                id="audience"
                name="audience"
                maxLength={500}
                placeholder="Founders and engineers"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" name="status" defaultValue="draft">
                {PROJECT_STATUSES.filter((s) => s !== "archived").map((s) => (
                  <option key={s} value={s} className="capitalize">
                    {s}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visibility">Visibility</Label>
              <Select id="visibility" name="visibility" defaultValue="private">
                {PROJECT_VISIBILITIES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language">Language</Label>
              <Select id="language" name="language" defaultValue="en">
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-error-400">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="submit" loading={pending}>
              Create project
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

/* --------------------------------------------------------------- card */

function ProjectCard({
  project,
  onToggleFavorite,
  onArchive,
  onDelete,
}: {
  project: Project;
  onToggleFavorite: (p: Project) => void;
  onArchive: (p: Project) => void;
  onDelete: (p: Project) => void;
}) {
  const [busy, setBusy] = React.useState(false);

  const run = async (action: () => void | Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <LiftCard>
      <Card className={cn("h-full", project.is_archived && "opacity-60")}>
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display font-semibold leading-tight">{project.title}</h3>
            <button
              type="button"
              aria-label={project.is_favorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={project.is_favorite}
              disabled={busy}
              onClick={() => void run(() => onToggleFavorite(project))}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-warning-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
            >
              <Star
                className={cn("h-4 w-4", project.is_favorite && "fill-warning-400 text-warning-400")}
              />
            </button>
          </div>

          {project.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            {project.category ? <Badge>{project.category}</Badge> : null}
          </div>

          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(project.updated_at)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={project.is_archived ? "Unarchive project" : "Archive project"}
                disabled={busy}
                onClick={() => void run(() => onArchive(project))}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              >
                <Archive className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Delete project"
                disabled={busy}
                onClick={() => void run(() => onDelete(project))}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </LiftCard>
  );
}

/* ---------------------------------------------------------------- page */

export function ProjectsWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ApiError | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"" | ProjectStatus>("");
  const [showArchived, setShowArchived] = React.useState(false);

  const load = React.useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const page = await projectsApi.list(
          {
            search: search || undefined,
            status: status || undefined,
            include_archived: showArchived || undefined,
            limit: 50,
          },
          signal,
        );
        setProjects(page.items);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError
            ? err
            : new ApiError("UNKNOWN", "Something went wrong loading projects.", 0),
        );
      } finally {
        setLoading(false);
      }
    },
    [search, status, showArchived],
  );

  // Debounce search; refetch immediately for filter toggles.
  React.useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => void load(controller.signal), search ? 300 : 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, search]);

  const toggleFavorite = async (project: Project) => {
    const next = !project.is_favorite;
    setProjects((all) =>
      all.map((p) => (p.id === project.id ? { ...p, is_favorite: next } : p)),
    );
    try {
      await projectsApi.update(project.id, { is_favorite: next });
    } catch {
      // Revert on failure — the optimistic update must not lie.
      setProjects((all) =>
        all.map((p) => (p.id === project.id ? { ...p, is_favorite: !next } : p)),
      );
    }
  };

  const toggleArchive = async (project: Project) => {
    const next = !project.is_archived;
    try {
      await projectsApi.update(project.id, { is_archived: next });
      await load();
    } catch {
      setError(new ApiError("UPDATE_FAILED", "Could not update the project.", 0));
    }
  };

  const remove = async (project: Project) => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    const snapshot = projects;
    setProjects((all) => all.filter((p) => p.id !== project.id));
    try {
      await projectsApi.remove(project.id);
    } catch {
      setProjects(snapshot);
      setError(new ApiError("DELETE_FAILED", "Could not delete the project.", 0));
    }
  };

  /* ------------------------------------------------------------ render */

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="Backend not connected yet"
        description="Projects are ready and waiting on the API. Set NEXT_PUBLIC_API_URL to your deployed PodMind API and this page will come to life."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="pl-9"
          />
        </div>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | ProjectStatus)}
          aria-label="Filter by status"
          className="w-40"
        >
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Button
          variant="secondary"
          onClick={() => setShowArchived((v) => !v)}
          aria-pressed={showArchived}
        >
          <Archive className="h-4 w-4" />
          {showArchived ? "Hiding none" : "Show archived"}
        </Button>

        <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => void load()}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>

        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {creating ? (
        <CreateProjectForm
          onCancel={() => setCreating(false)}
          onCreated={(project) => {
            setCreating(false);
            setProjects((all) => [project, ...all]);
          }}
        />
      ) : null}

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p role="alert" className="text-sm text-error-400">
              {error.isUnreachable
                ? "The PodMind API is not reachable right now. Once the backend is deployed this page will load your projects."
                : error.message}
            </p>
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {loading && projects.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : null}

      {!loading && !error && projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={search || status ? "No projects match those filters" : "No projects yet"}
          description={
            search || status
              ? "Try a different search term or clear the status filter."
              : "Projects hold the research, guests, outlines and scripts for an episode. Create your first one to get started."
          }
        />
      ) : null}

      {projects.length > 0 ? (
        <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Item key={project.id}>
              <ProjectCard
                project={project}
                onToggleFavorite={toggleFavorite}
                onArchive={toggleArchive}
                onDelete={remove}
              />
            </Item>
          ))}
        </Reveal>
      ) : null}

      {loading && projects.length > 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Refreshing…
        </p>
      ) : null}
    </div>
  );
}
