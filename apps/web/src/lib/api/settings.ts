import { apiRequest } from "./client";

export const THEMES = ["dark", "light", "system"] as const;
export const TONES = [
  "professional",
  "friendly",
  "formal",
  "casual",
  "humorous",
  "motivational",
  "technical",
] as const;

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  country: string | null;
  timezone: string | null;
  language: string | null;
  role: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Preferences {
  id: string;
  theme: string | null;
  ai_provider: string | null;
  default_language: string | null;
  writing_tone: string | null;
  auto_save: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  marketing_emails: boolean;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string | null;
  allow_member_invites: boolean | null;
  allow_public_projects: boolean | null;
  default_language: string | null;
  default_ai_provider: string | null;
  available_credits: number | null;
  used_credits: number | null;
  workspaces: number;
  members: number;
}

export interface Usage {
  projects: number;
  ai_requests: number;
  tokens: number;
  failed_requests: number;
}

export interface SettingsBundle {
  profile: Profile | null;
  preferences: Preferences;
  organization: OrganizationSettings | null;
  usage: Usage;
}

export const settingsApi = {
  getAll: (signal?: AbortSignal) => apiRequest<SettingsBundle>("/settings", { signal }),

  updateProfile: (body: Partial<Profile>) =>
    apiRequest<Profile>("/settings/profile", { method: "PATCH", body }),

  updatePreferences: (body: Partial<Preferences>) =>
    apiRequest<Preferences>("/settings/preferences", { method: "PATCH", body }),

  updateOrganization: (body: Partial<OrganizationSettings>) =>
    apiRequest<OrganizationSettings>("/settings/organization", { method: "PATCH", body }),
};
