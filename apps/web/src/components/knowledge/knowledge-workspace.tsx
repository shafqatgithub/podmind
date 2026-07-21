"use client";

/**
 * Knowledge Hub — documents the AI can cite.
 *
 * Everything is scoped to a project, because that is the boundary the
 * assistant retrieves against: what you add here is what chat can quote back
 * when answering about that show.
 */

import * as React from "react";
import {
  BookOpen,
  FileText,
  Loader2,
  Plus,
  Search,
  Sparkles,
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
import { projectsApi, type Project } from "@/lib/api/projects";
import {
  knowledgeApi,
  type KnowledgeDocument,
  type KnowledgeHit,
  type KnowledgeStatus,
} from "@/lib/api/knowledge";
import { EmptyState } from "@/components/common/empty-state";
import { Appear, Item } from "@/components/motion/motion";

function relevanceLabel(similarity: number): { label: string; className: string } {
  if (similarity >= 0.6) return { label: "Strong match", className: "bg-success-500/15 text-success-300" };
  if (similarity >= 0.4) return { label: "Good match", className: "bg-primary-500/15 text-primary-300" };
  return { label: "Loose match", className: "bg-warning-500/15 text-warning-300" };
}

export function KnowledgeWorkspace() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectId, setProjectId] = React.useState("");
  const [documents, setDocuments] = React.useState<KnowledgeDocument[]>([]);
  const [status, setStatus] = React.useState<KnowledgeStatus | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [hits, setHits] = React.useState<KnowledgeHit[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const [page, s] = await Promise.all([
          projectsApi.list({ limit: 100 }, controller.signal),
          knowledgeApi.status(controller.signal).catch(() => null),
        ]);
        const active = page.items.filter((p) => !p.is_archived);
        setProjects(active);
        setStatus(s);
        if (active[0]) setProjectId(active[0].id);
      } catch (err) {
        if (err instanceof ApiError && !err.isUnreachable) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const loadDocuments = React.useCallback(async (id: string, signal?: AbortSignal) => {
    if (!id) return;
    try {
      const result = await knowledgeApi.list(id, signal);
      setDocuments(result.items);
    } catch {
      setDocuments([]);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    setHits(null);
    void loadDocuments(projectId, controller.signal);
    return () => controller.abort();
  }, [projectId, loadDocuments]);

  const addDocument = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();
    const sourceUrl = String(form.get("source_url") ?? "").trim();

    if (!title || content.length < 20) {
      setError("Give the document a title and at least a short paragraph of text.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await knowledgeApi.create({
        project_id: projectId,
        title,
        content,
        ...(sourceUrl ? { source_url: sourceUrl } : {}),
      });
      setAdding(false);
      await loadDocuments(projectId);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === "DUPLICATE_DOCUMENT"
            ? err.message
            : err.code === "EMBEDDINGS_UNAVAILABLE"
              ? "Knowledge search needs an OpenAI API key on the backend."
              : err.message
          : "Could not add the document.",
      );
    } finally {
      setSaving(false);
    }
  };

  const runSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    setSearching(true);
    setError(null);
    try {
      const result = await knowledgeApi.search({ project_id: projectId, query: trimmed });
      setHits(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const remove = async (document: KnowledgeDocument) => {
    if (!window.confirm(`Remove "${document.title}" from the knowledge base?`)) return;
    const snapshot = documents;
    setDocuments((all) => all.filter((d) => d.id !== document.id));
    try {
      await knowledgeApi.remove(document.id);
      setHits(null);
    } catch {
      setDocuments(snapshot);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to build a knowledge base."
      />
    );
  }

  if (!loading && projects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Create a project first"
        description="Knowledge lives inside a project, so the assistant knows which show a document belongs to."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Project + add */}
      <div className="flex flex-wrap items-center gap-3">
        {loading ? (
          <Skeleton className="h-10 w-64 rounded" />
        ) : (
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            aria-label="Project"
            className="w-64"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        )}

        <Button onClick={() => setAdding((v) => !v)} disabled={!projectId}>
          <Plus className="h-4 w-4" />
          Add document
        </Button>

        {status && !status.available ? (
          <Badge className="bg-warning-500/15 text-warning-300">
            Embeddings not configured
          </Badge>
        ) : null}
      </div>

      {status && !status.available ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Knowledge search turns your documents into vectors so the assistant can find the
            right passage by meaning. That needs an OpenAI API key on the backend — add
            <code className="mx-1 rounded bg-surface px-1 py-0.5 text-xs">OPENAI_API_KEY</code>
            and this page becomes available.
          </CardContent>
        </Card>
      ) : null}

      {adding ? (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={addDocument} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" maxLength={300} placeholder="Interview notes — Dr Sarah Chen" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={10}
                  maxLength={500000}
                  placeholder="Paste transcripts, notes, articles or research the assistant should be able to quote…"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Long documents are split into passages automatically.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="source_url">Source URL (optional)</Label>
                <Input id="source_url" name="source_url" maxLength={2000} placeholder="https://…" />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" loading={saving}>
                  Add to knowledge base
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAdding(false)} disabled={saving}>
                  Cancel
                </Button>
                <span className="text-xs text-muted-foreground">
                  Uses {status?.ingest_credits ?? 2} AI credits
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-error-400">
          {error}
        </p>
      ) : null}

      {/* Search */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5">
          <form onSubmit={runSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask your documents a question…"
                aria-label="Search knowledge"
                className="pl-9"
                disabled={documents.length === 0}
              />
            </div>
            <Button type="submit" loading={searching} disabled={documents.length === 0 || !query.trim()}>
              Search
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Searches by meaning, not keywords — ask the way you would ask a person.
          </p>

          {hits !== null && !searching ? (
            hits.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing in your documents matched that closely.
              </p>
            ) : (
              <Appear className="flex flex-col gap-3">
                {hits.map((hit) => {
                  const relevance = relevanceLabel(hit.similarity);
                  return (
                    <Item key={hit.chunk_id}>
                      <div className="rounded border border-border/60 p-4">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-primary-400" aria-hidden />
                          <span className="text-sm font-medium">{hit.document_title}</span>
                          <Badge className={cn("ml-auto text-[10px]", relevance.className)}>
                            {relevance.label} · {Math.round(hit.similarity * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{hit.chunk_text}</p>
                      </div>
                    </Item>
                  );
                })}
              </Appear>
            )
          ) : null}
        </CardContent>
      </Card>

      {/* Library */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Documents ({documents.length})
        </h2>

        {documents.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No documents yet"
            description="Add transcripts, notes or articles. The assistant will quote them when you ask about this project in chat."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-medium leading-tight">{document.title}</h3>
                    <button
                      type="button"
                      aria-label={`Remove ${document.title}`}
                      onClick={() => void remove(document)}
                      className="rounded p-1 text-muted-foreground transition-colors hover:text-error-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <Badge className="text-[10px]">{document.chunk_count ?? 0} passages</Badge>
                    {document.source_url ? (
                      <a
                        href={document.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-primary-400 hover:text-primary-300"
                      >
                        source
                      </a>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {documents.length > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary-400" aria-hidden />
          These documents are searched automatically when you chat about this project.
        </p>
      ) : null}

      {searching ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Searching…
        </p>
      ) : null}
    </div>
  );
}
