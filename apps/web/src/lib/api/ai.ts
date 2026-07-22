import { apiRequest } from "./client";

export interface AiProviderStatus {
  slug: "openai" | "anthropic" | "google";
  configured: boolean;
}

export interface AiStatus {
  providers: AiProviderStatus[];
  ready: boolean;
  tasks: { task: string; credits: number; route: string[]; available: boolean }[];
}

/** Providers a user may pin a request to; "auto" follows the routing rules. */
export const SELECTABLE_PROVIDERS = ["openai", "anthropic", "google"] as const;
export type SelectableProvider = (typeof SELECTABLE_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI (GPT-5)",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
};

export const aiApi = {
  status: (signal?: AbortSignal) => apiRequest<AiStatus>("/ai/status", { signal }),
};
