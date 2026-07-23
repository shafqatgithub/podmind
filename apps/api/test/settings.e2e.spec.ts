import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { SettingsModule } from "../src/settings/settings.module";
import { SettingsService } from "../src/settings/settings.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Settings", () => {
  let service: SettingsService;
  let pool: Pool;
  let tenant: TenantContext;

  const userId = randomUUID();
  const orgId = randomUUID();
  let workspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        SettingsModule,
      ],
    }).compile();

    service = moduleRef.get(SettingsService);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
      userId,
      `settings-${userId.slice(0, 8)}@podmind.test`,
    ]);
    await pool.query(
      `insert into public.profiles (id, email, full_name) values ($1,$2,'Original Name')
       on conflict (id) do update set full_name = 'Original Name'`,
      [userId, `settings-${userId.slice(0, 8)}@podmind.test`],
    );
    await pool.query(
      `insert into public.organizations (id,name,slug,owner_id) values ($1,'Settings Org',$2,$3)`,
      [orgId, `settings-${orgId.slice(0, 8)}`, userId],
    );
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `sws-${orgId.slice(0, 8)}`, userId],
    );
    workspaceId = ws.rows[0]!.id;
    await pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 500, 0, 500)`,
      [orgId],
    );

    tenant = { userId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(`delete from public.user_preferences where user_id = $1`, [userId]);
    await pool.query(`delete from public.organization_settings where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = $1`, [orgId]);
    await pool.query(`delete from public.profiles where id = $1`, [userId]);
    await pool.query(`delete from auth.users where id = $1`, [userId]);
    await pool.end();
  });

  it("returns profile, preferences, organization and usage in one call", async () => {
    const all = await service.getAll(tenant);
    expect(all.profile).toMatchObject({ id: userId, full_name: "Original Name" });
    expect(all.organization).toMatchObject({ id: orgId, name: "Settings Org" });
    expect(all.usage).toHaveProperty("projects");
    expect(all.preferences).toHaveProperty("theme");
  });

  it("provisions default preferences on first read rather than returning nothing", async () => {
    await pool.query(`delete from public.user_preferences where user_id = $1`, [userId]);
    const all = await service.getAll(tenant);
    expect(all.preferences).toBeTruthy();
    expect(all.preferences.id).toBeTruthy();
  });

  it("updates the profile fields it offers", async () => {
    const updated = await service.updateProfile(tenant, {
      full_name: "New Name",
      job_title: "Host",
      timezone: "Asia/Karachi",
      language: "ur",
    });
    expect(updated).toMatchObject({
      full_name: "New Name",
      job_title: "Host",
      timezone: "Asia/Karachi",
      language: "ur",
    });
  });

  it("ignores fields the user was never offered", async () => {
    // A client could send `role` hoping to escalate. The whitelist must drop it.
    await service.updateProfile(tenant, {
      full_name: "Still Me",
      role: "super_admin",
      is_active: false,
      organization_id: randomUUID(),
    } as never);

    const { rows } = await pool.query<{ role: string; is_active: boolean }>(
      `select role::text as role, is_active from public.profiles where id = $1`,
      [userId],
    );
    expect(rows[0]!.role).toBe("user");
    expect(rows[0]!.is_active).toBe(true);
  });

  it("updates preferences including the enum-backed ones", async () => {
    const prefs = await service.updatePreferences(tenant, {
      theme: "light",
      ai_provider: "anthropic",
      writing_tone: "casual",
      default_language: "ur",
      email_notifications: false,
    });
    expect(prefs).toMatchObject({
      theme: "light",
      ai_provider: "anthropic",
      writing_tone: "casual",
      default_language: "ur",
      email_notifications: false,
    });
  });

  it("updates organization name and settings, creating the settings row on demand", async () => {
    const org = await service.updateOrganization(tenant, {
      name: "Renamed Studio",
      allow_member_invites: false,
      default_ai_provider: "google",
      default_language: "ur",
    });
    expect(org).toMatchObject({
      name: "Renamed Studio",
      allow_member_invites: false,
      default_ai_provider: "google",
      default_language: "ur",
    });
  });

  it("reports usage counts scoped to this organization", async () => {
    await pool.query(
      `insert into public.projects (workspace_id, owner_id, title) values ($1,$2,'Counted')`,
      [workspaceId, userId],
    );
    const all = await service.getAll(tenant);
    expect(Number(all.usage.projects)).toBe(1);
    await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
  });

  it("leaves everything unchanged when the patch is empty", async () => {
    const before = await service.getAll(tenant);
    const after = await service.updateProfile(tenant, {});
    expect(after.full_name).toBe(before.profile.full_name);
  });
});
