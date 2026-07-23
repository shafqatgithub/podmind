import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

/**
 * Settings repository.
 *
 * Updates are built from whitelists, never from the request object, so a
 * client cannot reach a column it was not offered (role, is_active,
 * organization_id and similar stay out of reach by construction).
 */
@Injectable()
export class SettingsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly PROFILE_FIELDS = [
    "full_name",
    "bio",
    "company",
    "job_title",
    "country",
    "timezone",
    "website",
  ] as const;

  private static readonly PREFERENCE_FIELDS = [
    "theme",
    "auto_save",
    "email_notifications",
    "push_notifications",
    "marketing_emails",
  ] as const;

  private static readonly ORG_SETTING_FIELDS = [
    "allow_member_invites",
    "allow_public_projects",
  ] as const;

  async getProfile(userId: string) {
    const { rows } = await this.pool.query(
      `select id, email::text as email, full_name, username::text as username, avatar_url,
              bio, website, company, job_title, country, timezone,
              language::text as language, role::text as role,
              onboarding_completed, created_at
         from public.profiles where id = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async updateProfile(userId: string, patch: Record<string, unknown>) {
    const sets: string[] = [];
    const params: unknown[] = [userId];

    for (const field of SettingsRepository.PROFILE_FIELDS) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (patch.language !== undefined) {
      params.push(patch.language);
      sets.push(`language = $${params.length}::language_code`);
    }
    if (sets.length === 0) return this.getProfile(userId);

    const { rows } = await this.pool.query(
      `update public.profiles set ${sets.join(", ")}, updated_at = now()
        where id = $1
        returning id, email::text as email, full_name, username::text as username,
                  avatar_url, bio, website, company, job_title, country, timezone,
                  language::text as language, role::text as role,
                  onboarding_completed, created_at`,
      params,
    );
    return rows[0] ?? null;
  }

  /** Preferences may not exist yet, so reads provision the documented defaults. */
  async getPreferences(userId: string) {
    const { rows } = await this.pool.query(
      `insert into public.user_preferences (user_id)
       values ($1)
       on conflict (user_id) do update set user_id = excluded.user_id
       returning id, theme, ai_provider::text as ai_provider,
                 default_language::text as default_language,
                 writing_tone::text as writing_tone, auto_save,
                 email_notifications, push_notifications, marketing_emails`,
      [userId],
    );
    return rows[0]!;
  }

  async updatePreferences(userId: string, patch: Record<string, unknown>) {
    await this.getPreferences(userId);

    const sets: string[] = [];
    const params: unknown[] = [userId];

    for (const field of SettingsRepository.PREFERENCE_FIELDS) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    for (const [field, cast] of [
      ["ai_provider", "ai_provider"],
      ["default_language", "language_code"],
      ["writing_tone", "content_tone"],
    ] as const) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}::${cast}`);
      }
    }
    if (sets.length === 0) return this.getPreferences(userId);

    const { rows } = await this.pool.query(
      `update public.user_preferences set ${sets.join(", ")}, updated_at = now()
        where user_id = $1
        returning id, theme, ai_provider::text as ai_provider,
                  default_language::text as default_language,
                  writing_tone::text as writing_tone, auto_save,
                  email_notifications, push_notifications, marketing_emails`,
      params,
    );
    return rows[0]!;
  }

  async getOrganization(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select o.id, o.name, o.slug::text as slug,
              s.allow_member_invites, s.allow_public_projects,
              s.default_language::text as default_language,
              s.default_ai_provider::text as default_ai_provider,
              b.available_credits, b.used_credits,
              (select count(*) from public.workspaces w where w.organization_id = o.id) as workspaces,
              (select count(*) from public.organization_members m where m.organization_id = o.id) as members
         from public.organizations o
         left join public.organization_settings s on s.organization_id = o.id
         left join public.ai_credit_balances b on b.organization_id = o.id
        where o.id = $1`,
      [tenant.organizationId],
    );
    return rows[0] ?? null;
  }

  async updateOrganization(tenant: TenantContext, patch: Record<string, unknown>) {
    if (patch.name !== undefined) {
      await this.pool.query(
        `update public.organizations set name = $2, updated_at = now() where id = $1`,
        [tenant.organizationId, patch.name],
      );
    }

    // Settings row is created on demand.
    await this.pool.query(
      `insert into public.organization_settings (organization_id)
       values ($1) on conflict (organization_id) do nothing`,
      [tenant.organizationId],
    );

    const sets: string[] = [];
    const params: unknown[] = [tenant.organizationId];

    for (const field of SettingsRepository.ORG_SETTING_FIELDS) {
      if (patch[field] !== undefined) {
        params.push(patch[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (patch.default_language !== undefined) {
      params.push(patch.default_language);
      sets.push(`default_language = $${params.length}::language_code`);
    }
    if (patch.default_ai_provider !== undefined) {
      params.push(patch.default_ai_provider);
      sets.push(`default_ai_provider = $${params.length}::ai_provider`);
    }

    if (sets.length > 0) {
      await this.pool.query(
        `update public.organization_settings set ${sets.join(", ")}, updated_at = now()
          where organization_id = $1`,
        params,
      );
    }
    return this.getOrganization(tenant);
  }

  /** Usage summary for the settings page: what this account has actually used. */
  async getUsage(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select
         (select count(*) from public.projects p
            join public.workspaces w on w.id = p.workspace_id
           where w.organization_id = $1) as projects,
         (select count(*) from public.ai_requests r where r.organization_id = $1) as ai_requests,
         (select coalesce(sum(r.total_tokens),0) from public.ai_requests r
           where r.organization_id = $1) as tokens,
         (select count(*) from public.ai_requests r
           where r.organization_id = $1 and r.success = false) as failed_requests`,
      [tenant.organizationId],
    );
    return rows[0]!;
  }
}
