/** Shared API envelope types used by the NestJS backend and all clients. */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiErrorEnvelope {
  error: ApiError;
}

/** Cursor pagination envelope for every list endpoint. */
export interface CursorPage<T> {
  items: T[];
  next_cursor: string | null;
  has_more: boolean;
}
