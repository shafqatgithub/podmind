import { apiRequest } from "./client";

export const API_SCOPES = [
  "projects:read", "projects:write",
  "research:read", "research:write",
  "scripts:read", "scripts:write",
  "guests:read", "guests:write",
  "seo:read", "seo:write",
  "analytics:read",
  "exports:read",
] as const;
export type ApiScope = (typeof API_SCOPES)[number];

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiScope[];
  rate_limit_per_minute: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

/** Only the create response ever carries the plaintext secret. */
export interface CreatedApiKey extends ApiKey {
  secret: string;
}

export const apiKeysApi = {
  create: (body: {
    name: string; permissions?: ApiScope[];
    rate_limit_per_minute?: number; expires_in_days?: number;
  }) => apiRequest<CreatedApiKey>("/api-keys", { method: "POST", body }),

  list: (signal?: AbortSignal) => apiRequest<{ items: ApiKey[] }>("/api-keys", { signal }),

  revoke: (id: string) => apiRequest<ApiKey>(`/api-keys/${id}/revoke`, { method: "POST" }),

  remove: (id: string) => apiRequest<{ deleted: boolean }>(`/api-keys/${id}`, { method: "DELETE" }),
};
