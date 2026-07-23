"use client";

/**
 * Settings workspace.
 *
 * Each section saves independently and reports its own result, so a failure
 * in one card never silently discards edits in another. Saved state is shown
 * briefly rather than with a permanent banner.
 */

import * as React from "react";
import { Building2, Check, CreditCard, Palette, User } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Skeleton,
  Textarea,
  cn,
} from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { LANGUAGES } from "@/lib/api/projects";
import { PROVIDER_LABELS } from "@/lib/api/ai";
import {
  settingsApi,
  THEMES,
  TONES,
  type OrganizationSettings,
  type Preferences,
  type Profile,
  type SettingsBundle,
} from "@/lib/api/settings";
import { EmptyState } from "@/components/common/empty-state";
import { Item, Reveal } from "@/components/motion/motion";

const AI_PROVIDERS = ["openai", "anthropic", "google"] as const;

/** Save button that briefly confirms, rather than leaving a permanent banner. */
function SaveButton({
  pending,
  saved,
  children = "Save changes",
}: {
  pending: boolean;
  saved: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Button type="submit" loading={pending}>
      {saved && !pending ? (
        <>
          <Check className="h-4 w-4" /> Saved
        </>
      ) : (
        children
      )}
    </Button>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof User;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <header className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Icon className="h-5 w-5 text-primary-400" aria-hidden />
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </header>
        {children}
      </CardContent>
    </Card>
  );
}

export function SettingsWorkspace() {
  const [data, setData] = React.useState<SettingsBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [savingSection, setSavingSection] = React.useState<string | null>(null);
  const [savedSection, setSavedSection] = React.useState<string | null>(null);
  const [sectionError, setSectionError] = React.useState<Record<string, string | null>>({});

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setData(await settingsApi.getAll(controller.signal));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(
          err instanceof ApiError && err.isUnreachable
            ? "The PodMind API is not reachable right now."
            : "Could not load your settings.",
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const runSave = async (section: string, action: () => Promise<void>) => {
    setSavingSection(section);
    setSectionError((e) => ({ ...e, [section]: null }));
    try {
      await action();
      setSavedSection(section);
      setTimeout(() => setSavedSection((s) => (s === section ? null : s)), 2500);
    } catch (err) {
      setSectionError((e) => ({
        ...e,
        [section]: err instanceof ApiError ? err.message : "Could not save. Please try again.",
      }));
    } finally {
      setSavingSection(null);
    }
  };

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={User}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to manage your settings."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-lg" />
        ))}
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p role="alert" className="text-sm text-error-400">
            {loadError}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { profile, preferences, organization, usage } = data;

  return (
    <Reveal className="flex flex-col gap-6">
      {/* Profile */}
      <Item>
        <SettingsCard
          icon={User}
          title="Profile"
          description="How you appear across PodMind."
        >
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const patch: Partial<Profile> = {
                full_name: String(form.get("full_name") ?? "") || undefined,
                job_title: String(form.get("job_title") ?? "") || undefined,
                company: String(form.get("company") ?? "") || undefined,
                country: String(form.get("country") ?? "") || undefined,
                timezone: String(form.get("timezone") ?? "") || undefined,
                website: String(form.get("website") ?? "") || undefined,
                bio: String(form.get("bio") ?? "") || undefined,
                language: String(form.get("language") ?? "") || undefined,
              };
              void runSave("profile", async () => {
                const updated = await settingsApi.updateProfile(patch);
                setData((d) => (d ? { ...d, profile: updated } : d));
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  defaultValue={profile?.full_name ?? ""}
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile?.email ?? ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your sign-in method.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job_title">Role</Label>
                <Input
                  id="job_title"
                  name="job_title"
                  defaultValue={profile?.job_title ?? ""}
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  name="company"
                  defaultValue={profile?.company ?? ""}
                  maxLength={200}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  name="country"
                  defaultValue={profile?.country ?? ""}
                  maxLength={100}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  name="timezone"
                  defaultValue={profile?.timezone ?? ""}
                  placeholder="Asia/Karachi"
                  maxLength={100}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="language">Language</Label>
                <Select id="language" name="language" defaultValue={profile?.language ?? "en"}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  defaultValue={profile?.website ?? ""}
                  maxLength={500}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  defaultValue={profile?.bio ?? ""}
                  maxLength={1000}
                />
              </div>
            </div>

            {sectionError.profile ? (
              <p role="alert" className="text-sm text-error-400">
                {sectionError.profile}
              </p>
            ) : null}

            <div>
              <SaveButton
                pending={savingSection === "profile"}
                saved={savedSection === "profile"}
              />
            </div>
          </form>
        </SettingsCard>
      </Item>

      {/* Preferences */}
      <Item>
        <SettingsCard
          icon={Palette}
          title="Preferences"
          description="Defaults PodMind uses when generating content for you."
        >
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const patch: Partial<Preferences> = {
                theme: String(form.get("theme") ?? "") || undefined,
                ai_provider: String(form.get("ai_provider") ?? "") || undefined,
                default_language: String(form.get("default_language") ?? "") || undefined,
                writing_tone: String(form.get("writing_tone") ?? "") || undefined,
                auto_save: form.get("auto_save") === "on",
                email_notifications: form.get("email_notifications") === "on",
                push_notifications: form.get("push_notifications") === "on",
                marketing_emails: form.get("marketing_emails") === "on",
              };
              void runSave("preferences", async () => {
                const updated = await settingsApi.updatePreferences(patch);
                setData((d) => (d ? { ...d, preferences: updated } : d));
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="theme">Theme</Label>
                <Select id="theme" name="theme" defaultValue={preferences.theme ?? "dark"}>
                  {THEMES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ai_provider">Preferred AI provider</Label>
                <Select
                  id="ai_provider"
                  name="ai_provider"
                  defaultValue={preferences.ai_provider ?? "openai"}
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {PROVIDER_LABELS[p] ?? p}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">
                  A preference, not a rule — PodMind still falls back if it is unavailable.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="default_language">Default language</Label>
                <Select
                  id="default_language"
                  name="default_language"
                  defaultValue={preferences.default_language ?? "en"}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="writing_tone">Writing tone</Label>
                <Select
                  id="writing_tone"
                  name="writing_tone"
                  defaultValue={preferences.writing_tone ?? "professional"}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium">Notifications</legend>
              {(
                [
                  ["auto_save", "Auto-save my work", preferences.auto_save],
                  ["email_notifications", "Email notifications", preferences.email_notifications],
                  ["push_notifications", "Push notifications", preferences.push_notifications],
                  ["marketing_emails", "Product news and tips", preferences.marketing_emails],
                ] as const
              ).map(([name, label, checked]) => (
                <label key={name} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    name={name}
                    defaultChecked={checked}
                    className="h-4 w-4 rounded border-border bg-input accent-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            {sectionError.preferences ? (
              <p role="alert" className="text-sm text-error-400">
                {sectionError.preferences}
              </p>
            ) : null}

            <div>
              <SaveButton
                pending={savingSection === "preferences"}
                saved={savedSection === "preferences"}
              />
            </div>
          </form>
        </SettingsCard>
      </Item>

      {/* Organization */}
      {organization ? (
        <Item>
          <SettingsCard
            icon={Building2}
            title="Organization"
            description="Your studio and its shared defaults."
          >
            <form
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const patch: Partial<OrganizationSettings> = {
                  name: String(form.get("name") ?? "") || undefined,
                  default_language: String(form.get("org_language") ?? "") || undefined,
                  default_ai_provider: String(form.get("org_provider") ?? "") || undefined,
                  allow_member_invites: form.get("allow_member_invites") === "on",
                  allow_public_projects: form.get("allow_public_projects") === "on",
                };
                void runSave("organization", async () => {
                  const updated = await settingsApi.updateOrganization(patch);
                  setData((d) => (d ? { ...d, organization: updated } : d));
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="name">Organization name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={organization.name}
                    maxLength={200}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="org_language">Default language</Label>
                  <Select
                    id="org_language"
                    name="org_language"
                    defaultValue={organization.default_language ?? "en"}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="org_provider">Default AI provider</Label>
                  <Select
                    id="org_provider"
                    name="org_provider"
                    defaultValue={organization.default_ai_provider ?? "openai"}
                  >
                    {AI_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {PROVIDER_LABELS[p] ?? p}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 text-sm font-medium">Sharing</legend>
                {(
                  [
                    ["allow_member_invites", "Members can invite others", organization.allow_member_invites],
                    ["allow_public_projects", "Allow public projects", organization.allow_public_projects],
                  ] as const
                ).map(([name, label, checked]) => (
                  <label key={name} className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      name={name}
                      defaultChecked={checked ?? false}
                      className="h-4 w-4 rounded border-border bg-input accent-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                    {label}
                  </label>
                ))}
              </fieldset>

              {sectionError.organization ? (
                <p role="alert" className="text-sm text-error-400">
                  {sectionError.organization}
                </p>
              ) : null}

              <div>
                <SaveButton
                  pending={savingSection === "organization"}
                  saved={savedSection === "organization"}
                />
              </div>
            </form>
          </SettingsCard>
        </Item>
      ) : null}

      {/* Usage */}
      <Item>
        <SettingsCard
          icon={CreditCard}
          title="Usage"
          description="What this account has actually used."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(
              [
                ["AI credits left", organization?.available_credits ?? 0, "text-primary-300"],
                ["Credits used", organization?.used_credits ?? 0, "text-foreground"],
                ["Projects", usage.projects, "text-foreground"],
                ["AI requests", usage.ai_requests, "text-foreground"],
              ] as const
            ).map(([label, value, tone]) => (
              <div key={label} className="rounded border border-border/60 p-4">
                <p className={cn("font-display text-2xl font-bold", tone)}>
                  {Number(value).toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{Number(usage.tokens).toLocaleString()} tokens processed</span>
            {Number(usage.failed_requests) > 0 ? (
              <>
                <span aria-hidden>·</span>
                <Badge className="bg-warning-500/15 text-warning-300">
                  {usage.failed_requests} failed requests
                </Badge>
              </>
            ) : null}
            {organization ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  {organization.workspaces} workspace
                  {Number(organization.workspaces) === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Buying more credits arrives with billing.
          </p>
        </SettingsCard>
      </Item>
    </Reveal>
  );
}
