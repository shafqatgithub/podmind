import type { ApiResponse } from "@podmind/types";
import { createClient } from "@/lib/supabase/client";

/**
 * Client for the PodMind API.
 *
 * Every response uses the documented envelope, so this is the one place that
 * unwraps it: callers get `data` directly, or an ApiError carrying the
 * machine-readable code so UI can branch on INSUFFICIENT_CREDITS, NOT_FOUND
 * and friends without string matching.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly requestId?: string,
    /**
     * Structured payload from the API — e.g. how many credits a run needed
     * against what was available. Dropped previously, which left the UI able
     * to say only "not enough credits" with no figures to act on.
     */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True when the API itself is unreachable or not configured yet. */
  get isUnreachable(): boolean {
    return this.code === "API_UNREACHABLE" || this.code === "API_NOT_CONFIGURED";
  }
}

function baseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/** Whether the backend URL is configured (used to render a setup hint). */
export function isApiConfigured(): boolean {
  return baseUrl() !== null;
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  if (!supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? { authorization: `Bearer ${session.access_token}` } : {};
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Query parameters; undefined and empty values are dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip the read cache and go to the network. */
  fresh?: boolean;
}

/* ------------------------------------------------------------- caching */

/**
 * A short read-through cache for GETs.
 *
 * Every screen refetched from scratch on mount, so moving between pages meant
 * waiting on the network for data the app had held moments earlier — Billing
 * in particular felt slow for a payload that rarely changes within a session.
 *
 * Three rules keep it honest:
 *
 * 1. Only GETs are cached, and only briefly. Stale data is a real cost, so the
 *    window is short enough that nothing meaningful drifts inside it.
 * 2. Any write clears everything. A POST or PATCH can change counts, credits
 *    and lists at once, and reasoning about which keys a mutation touches is
 *    exactly the kind of bookkeeping that rots — clearing the lot is cheap and
 *    cannot be wrong.
 * 3. Concurrent identical GETs share one request, so a page loading the same
 *    list from two components hits the network once.
 *
 * It lives in memory only: a session-lifetime cache, never storage.
 */
const TTL_MS = 20_000;

interface CacheEntry {
  at: number;
  value: unknown;
}

const readCache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

/** Drop cached reads. Called automatically after every write. */
export function invalidateApiCache(): void {
  readCache.clear();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const cacheKey =
    method === "GET" && !options.fresh
      ? `${path}?${JSON.stringify(options.query ?? {})}`
      : null;

  if (cacheKey) {
    const hit = readCache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;

    const pending = inflight.get(cacheKey);
    if (pending) return (await pending) as T;

    // The caller's signal is deliberately dropped: this request may be shared
    // with other components, and one of them unmounting must not cancel it for
    // everyone. An aborted caller simply ignores the result it receives.
    const request = requestUncached<T>(path, { ...options, signal: undefined })
      .then((value) => {
        readCache.set(cacheKey, { at: Date.now(), value });
        return value;
      })
      .finally(() => inflight.delete(cacheKey));

    inflight.set(cacheKey, request);
    return request;
  }

  try {
    return await requestUncached<T>(path, options);
  } finally {
    // A write may have changed anything; reads start again from the network.
    if (method !== "GET") invalidateApiCache();
  }
}

async function requestUncached<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const base = baseUrl();
  if (!base) {
    throw new ApiError(
      "API_NOT_CONFIGURED",
      "The PodMind API URL is not configured yet.",
      0,
    );
  }

  const url = new URL(`${base}/api/v1${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(await authHeader()),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch {
    throw new ApiError("API_UNREACHABLE", "Could not reach the PodMind API.", 0);
  }

  // 204 and empty bodies are valid (DELETE).
  const text = await response.text();
  if (!text) {
    if (response.ok) return null as T;
    throw new ApiError("HTTP_ERROR", `Request failed (${response.status})`, response.status);
  }

  let envelope: ApiResponse<T>;
  try {
    envelope = JSON.parse(text) as ApiResponse<T>;
  } catch {
    throw new ApiError("INVALID_RESPONSE", "The API returned an unreadable response.", response.status);
  }

  if (!response.ok || !envelope.success) {
    throw new ApiError(
      envelope.error?.code ?? "HTTP_ERROR",
      envelope.error?.message ?? `Request failed (${response.status})`,
      response.status,
      envelope.request_id,
      // The envelope types this as nullable; ApiError takes undefined.
      envelope.error?.details ?? undefined,
    );
  }

  return envelope.data as T;
}
