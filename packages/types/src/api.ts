/**
 * API envelope types — 30-API-SDK-Plan.md "API Response Format".
 * Every REST response from the NestJS backend uses this exact shape.
 */

export const API_VERSION = "v1" as const;

export interface ApiErrorBody {
  /** UPPER_SNAKE machine-readable code, e.g. "INVALID_REQUEST". */
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
  request_id: string;
  timestamp: string;
  version: typeof API_VERSION;
}

export type ApiSuccess<T> = ApiResponse<T> & { success: true; data: T; error: null };
export type ApiFailure = ApiResponse<never> & { success: false; data: null; error: ApiErrorBody };

/** Cursor pagination payload carried inside ApiResponse.data. */
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}
