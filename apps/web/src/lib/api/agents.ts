import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export const PIPELINE_STEPS = [
  { value: "research", label: "Research", hint: "Facts, statistics, angles and sources", credits: 10 },
  { value: "outline", label: "Outline", hint: "Segments, talking points and timings", credits: 5 },
  { value: "script", label: "Script", hint: "The full episode script", credits: 12 },
  { value: "seo", label: "SEO", hint: "Titles, description, chapters, keywords", credits: 3 },
  { value: "social", label: "Social posts", hint: "X, LinkedIn and Instagram", credits: 3 },
] as const;

export type PipelineStep = (typeof PIPELINE_STEPS)[number]["value"];

export interface AgentTask {
  id: string;
  task_name: string;
  task_type: PipelineStep;
  status: "queued" | "running" | "completed" | "failed" | "skipped";
  output: Record<string, unknown> | null;
  execution_time_ms: number | null;
  error_message: string | null;
  completed_at: string | null;
}

export interface AgentRun {
  id: string;
  project_id: string;
  session_name: string;
  status: "running" | "completed" | "partial" | "failed";
  metadata: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  tasks: AgentTask[];
}

export interface AgentRunSummary {
  id: string;
  session_name: string;
  status: AgentRun["status"];
  started_at: string;
  total_tasks: number;
  completed_tasks: number;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role: string | null;
  icon: string | null;
}

export const agentsApi = {
  list: (signal?: AbortSignal) => apiRequest<{ items: Agent[] }>("/agents", { signal }),

  createRun: (body: {
    project_id: string;
    topic: string;
    steps: PipelineStep[];
    duration_minutes?: number;
    guest_name?: string;
    provider?: SelectableProvider;
  }) => apiRequest<AgentRun>("/agents/runs", { method: "POST", body }),

  listRuns: (query: { project_id?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: AgentRunSummary[] }>("/agents/runs", { query: { ...query }, signal }),

  getRun: (id: string, signal?: AbortSignal) =>
    apiRequest<AgentRun>(`/agents/runs/${id}`, { signal }),
};
