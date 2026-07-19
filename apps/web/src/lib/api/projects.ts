import { apiRequest } from "./client";

/** Mirrors the live project_status enum. */
export const PROJECT_STATUSES = [
  "draft",
  "research",
  "outline",
  "writing",
  "review",
  "published",
  "archived",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_VISIBILITIES = ["private", "workspace", "organization", "public"] as const;
export type ProjectVisibility = (typeof PROJECT_VISIBILITIES)[number];

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ur", label: "Urdu" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" },
  { code: "tr", label: "Turkish" },
] as const;
export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export interface Project {
  id: string;
  workspace_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  language: LanguageCode | null;
  category: string | null;
  niche: string | null;
  audience: string | null;
  podcast_name: string | null;
  color: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectPage {
  items: Project[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface ProjectStats {
  total: number;
  by_status: Record<string, number>;
  favorites: number;
  archived: number;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  language?: LanguageCode;
  category?: string;
  niche?: string;
  audience?: string;
  podcast_name?: string;
  color?: string;
}

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  is_favorite?: boolean;
  is_archived?: boolean;
};

export interface ListProjectsQuery {
  search?: string;
  status?: ProjectStatus;
  favorites_only?: boolean;
  include_archived?: boolean;
  cursor?: string;
  limit?: number;
}

export const projectsApi = {
  list: (query: ListProjectsQuery = {}, signal?: AbortSignal) =>
    apiRequest<ProjectPage>("/projects", { query: { ...query }, signal }),

  stats: (signal?: AbortSignal) => apiRequest<ProjectStats>("/projects/stats", { signal }),

  get: (id: string, signal?: AbortSignal) => apiRequest<Project>(`/projects/${id}`, { signal }),

  create: (body: CreateProjectInput) =>
    apiRequest<Project>("/projects", { method: "POST", body }),

  update: (id: string, body: UpdateProjectInput) =>
    apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body }),

  remove: (id: string) => apiRequest<null>(`/projects/${id}`, { method: "DELETE" }),
};
