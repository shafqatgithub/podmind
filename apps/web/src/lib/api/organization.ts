import { apiRequest } from "./client";

export const ORGANIZATION_ROLES = ["admin", "manager", "member", "viewer"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** What each role can do, in the words a person choosing one would use. */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full control, including billing and ownership",
  admin: "Everything except transferring ownership",
  manager: "Create, and edit anyone's work; cannot manage members",
  member: "Create freely, but only edit or delete their own work",
  viewer: "Read everything; cannot create or change anything",
};

export interface OrganizationMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  is_active: boolean;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_owner: boolean;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
  invited_by_name: string | null;
}

export const organizationApi = {
  /** The caller's own role in the organization they are working in. */
  me: (signal?: AbortSignal) =>
    apiRequest<{ role: string; organization_id: string }>("/organization/me", { signal }),

  members: (signal?: AbortSignal) =>
    apiRequest<{ members: OrganizationMember[]; invitations: OrganizationInvitation[] }>(
      "/organization/members",
      { signal },
    ),

  invite: (body: { email: string; role: OrganizationRole }) =>
    apiRequest<{
      id: string;
      email: string;
      role: string;
      expires_at: string;
      /** Returned so it can be copied — email delivery is never certain. */
      invite_url: string;
    }>("/organization/invitations", { method: "POST", body }),

  revokeInvite: (id: string) =>
    apiRequest<{ revoked: boolean }>(`/organization/invitations/${id}`, { method: "DELETE" }),

  updateRole: (id: string, role: OrganizationRole) =>
    apiRequest<{ updated: boolean }>(`/organization/members/${id}`, {
      method: "PATCH",
      body: { role },
    }),

  removeMember: (id: string) =>
    apiRequest<{ removed: boolean }>(`/organization/members/${id}`, { method: "DELETE" }),
};
