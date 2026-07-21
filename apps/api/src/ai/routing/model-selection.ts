import type { AiTask, ProviderSlug } from "../providers/provider.types";

/**
 * Model Selection Engine — 17-AI-Router-Architecture "Model Selection Rules".
 *
 * Each task has an ordered preference list (preferred first, then documented
 * fallbacks). The Router walks the list and takes the first candidate whose
 * provider is configured and healthy, so a missing key or a provider outage
 * degrades quality gracefully instead of failing the request.
 *
 * Model ids are resolved against the `ai_models` table at runtime; the names
 * here are the documented families, mapped to concrete ids in ModelCatalog.
 */

export interface RouteCandidate {
  provider: ProviderSlug;
  /** Model family key, resolved to a concrete model id from the catalog. */
  family: string;
}

/** Documented preference chains per task. */
export const TASK_ROUTES: Record<AiTask, RouteCandidate[]> = {
  // Research: Claude Opus preferred; GPT-5 then Gemini Pro as fallbacks.
  research: [
    { provider: "anthropic", family: "claude-opus" },
    { provider: "openai", family: "gpt-5" },
    { provider: "google", family: "gemini-pro" },
  ],
  // Script Writing: GPT-5 preferred; Claude then Gemini.
  script: [
    { provider: "openai", family: "gpt-5" },
    { provider: "anthropic", family: "claude-sonnet" },
    { provider: "google", family: "gemini-pro" },
  ],
  // Outline shares the script chain (structured long-form writing).
  outline: [
    { provider: "openai", family: "gpt-5" },
    { provider: "anthropic", family: "claude-sonnet" },
    { provider: "google", family: "gemini-pro" },
  ],
  // SEO: GPT-5 Mini, Gemini Flash.
  seo: [
    { provider: "openai", family: "gpt-5-mini" },
    { provider: "google", family: "gemini-flash" },
  ],
  // Social/summary/translation are fast, cheap tasks.
  social: [
    { provider: "openai", family: "gpt-5-mini" },
    { provider: "google", family: "gemini-flash" },
  ],
  summary: [
    { provider: "google", family: "gemini-flash" },
    { provider: "openai", family: "gpt-5-mini" },
  ],
  translation: [
    { provider: "google", family: "gemini-flash" },
    { provider: "openai", family: "gpt-5-mini" },
  ],
  // Fact checking favours reasoning quality.
  fact_check: [
    { provider: "anthropic", family: "claude-opus" },
    { provider: "openai", family: "gpt-5" },
  ],
  // Guest research: quality-led like research.
  guest: [
    { provider: "anthropic", family: "claude-sonnet" },
    { provider: "openai", family: "gpt-5" },
    { provider: "google", family: "gemini-pro" },
  ],
  // Chat: GPT-5 Mini, Claude Sonnet.
  chat: [
    { provider: "openai", family: "gpt-5-mini" },
    { provider: "anthropic", family: "claude-sonnet" },
  ],
};

/** Long Context override — Gemini, then Claude (doc: "Long Context"). */
export const LONG_CONTEXT_ROUTE: RouteCandidate[] = [
  { provider: "google", family: "gemini-pro" },
  { provider: "anthropic", family: "claude-sonnet" },
];

/**
 * Last-resort candidate appended to every plan.
 *
 * The documented chains lead with premium models, which are exactly the ones
 * gated behind paid quota — a live run failed all three candidates with
 * "credit balance too low", "quota exceeded, limit: 0" and nothing left to
 * try. Gemini Flash is the doc's "Fast Responses" tier and is reachable on
 * free quota, so ending every chain with it turns a total failure into a
 * degraded but useful answer. It is only ever reached once every preferred
 * model has already failed.
 */
export const LAST_RESORT: RouteCandidate = { provider: "google", family: "gemini-flash" };

/** Above this prompt size the long-context chain takes over. */
export const LONG_CONTEXT_CHAR_THRESHOLD = 120_000;

/**
 * Build the ordered candidate list for a request.
 * `preferredProvider` (organization preference) is hoisted to the front when
 * it appears in the task chain — a preference, never a hard override, so
 * fallback still works if that provider is down.
 */
export function buildRoutePlan(
  task: AiTask,
  promptChars: number,
  preferredProvider?: ProviderSlug | null,
): RouteCandidate[] {
  const base =
    promptChars >= LONG_CONTEXT_CHAR_THRESHOLD ? LONG_CONTEXT_ROUTE : TASK_ROUTES[task];

  // De-duplicate while preserving order, then hoist the org preference.
  const plan = [...base];
  if (preferredProvider) {
    const index = plan.findIndex((c) => c.provider === preferredProvider);
    if (index > 0) {
      const [preferred] = plan.splice(index, 1);
      if (preferred) plan.unshift(preferred);
    }
  }

  // Safety net last, and only if the chain does not already end there.
  if (!plan.some((c) => c.provider === LAST_RESORT.provider && c.family === LAST_RESORT.family)) {
    plan.push(LAST_RESORT);
  }
  return plan;
}
