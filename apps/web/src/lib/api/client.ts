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
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
    );
  }

  return envelope.data as T;
}
