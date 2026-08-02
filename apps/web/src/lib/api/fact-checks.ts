import { apiRequest } from "./client";
import type { SelectableProvider } from "./ai";

export const CLAIM_VERDICTS = [
  "verified",
  "partially_verified",
  "unverified",
  "disputed",
  "false",
] as const;
export type ClaimVerdict = (typeof CLAIM_VERDICTS)[number];

export const CLAIM_TYPES = [
  "statistic",
  "quote",
  "date",
  "name",
  "company",
  "event",
  "other",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

/**
 * Evidence as the API stores it: a list of plain strings.
 *
 * This was typed as `{ source, url, detail }` objects while the backend saved
 * strings, so every citation rendered blank — the fields the UI read simply
 * did not exist. The object form is kept as a tolerated shape because older
 * rows may hold it, and because a future version that returns linked sources
 * should not require a migration to display.
 */
export type ClaimEvidence = string | { source?: string; detail?: string; url?: string };

/** Normalise either shape into something renderable. */
export function evidenceParts(item: ClaimEvidence): { text: string; url: string | null } {
  if (typeof item === "string") return { text: item, url: null };
  return { text: item.source ?? item.detail ?? item.url ?? "", url: item.url ?? null };
}

export interface FactCheckClaim {
  id: string;
  claim: string;
  claim_type: ClaimType;
  verdict: ClaimVerdict;
  confidence: number | null;
  explanation: string | null;
  correction: string | null;
  evidence: ClaimEvidence[] | null;
  sort_order: number;
}

export interface FactCheck {
  id: string;
  project_id: string;
  script_id: string | null;
  research_session_id: string | null;
  title: string;
  source_text: string | null;
  ai_provider: string | null;
  model_name: string | null;
  total_claims: number;
  verified_claims: number;
  flagged_claims: number;
  created_at: string;
  updated_at: string;
}

export interface FactCheckDetail extends FactCheck {
  claims: FactCheckClaim[];
}

export interface CreateFactCheckInput {
  project_id: string;
  script_id?: string;
  research_session_id?: string;
  text?: string;
  title?: string;
  provider?: SelectableProvider;
}

export const factChecksApi = {
  create: (body: CreateFactCheckInput) =>
    apiRequest<FactCheckDetail>("/fact-checks", { method: "POST", body }),

  list: (query: { project_id?: string } = {}, signal?: AbortSignal) =>
    apiRequest<{ items: FactCheck[] }>("/fact-checks", { query: { ...query }, signal }),

  get: (id: string, signal?: AbortSignal) =>
    apiRequest<FactCheckDetail>(`/fact-checks/${id}`, { signal }),

  remove: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/fact-checks/${id}`, { method: "DELETE" }),
};
