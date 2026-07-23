import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { AdminModule } from "../src/admin/admin.module";
import { AdminService } from "../src/admin/admin.service";
import { AdminGuard } from "../src/admin/admin.guard";

/** Minimal ExecutionContext carrying a user, as the auth guard would. */
function contextFor(userId: string | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => (userId ? { user: { id: userId } } : {}),
    }),
  } as unknown as ExecutionContext;
}

describe("Admin", () => {
  let service: AdminService;
  let guard: AdminGuard;
  let pool: Pool;

  const adminId = randomUUID();
  const plainUserId = randomUUID();
  const removedAdminId = randomUUID();
  const orgId = randomUUID();
  let workspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        AdminModule,
      ],
    }).compile();

    service = moduleRef.get(AdminService);
    guard = moduleRef.get(AdminGuard);
    pool = moduleRef.get<Pool>(PG_POOL);

    for (const [id, label] of [
      [adminId, "admin"],
      [plainUserId, "plain"],
      [removedAdminId, "removed"],
    ] as const) {
      await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
        id,
        `${label}-${id.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.profiles (id, email) values ($1,$2)
         on conflict (id) do nothing`,
        [id, `${label}-${id.slice(0, 8)}@podmind.test`],
      );
    }

    await pool.query(
      `insert into public.admin_users (user_id, role, is_super_admin, is_active)
       values ($1, 'owner', true, true)`,
      [adminId],
    );
    // An admin whose access was withdrawn but whose row remains.
    await pool.query(
      `insert into public.admin_users (user_id, role, is_super_admin, is_active)
       values ($1, 'support', false, false)`,
      [removedAdminId],
    );

    await pool.query(
      `insert into public.organizations (id,name,slug,owner_id) values ($1,'Admin Test Org',$2,$3)`,
      [orgId, `admin-${orgId.slice(0, 8)}`, adminId],
    );
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `adws-${orgId.slice(0, 8)}`, adminId],
    );
    workspaceId = ws.rows[0]!.id;
    await pool.query(
      `insert into public.projects (workspace_id, owner_id, title) values ($1,$2,'Admin Visible')`,
      [workspaceId, adminId],
    );
  });

  afterAll(async () => {
    await pool.query(`delete from public.feature_flags where name like 'test_flag%'`);
    await pool.query(`delete from public.system_announcements where title like 'Test %'`);
    await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
    await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = $1`, [orgId]);
    await pool.query(`delete from public.admin_users where user_id = any($1::uuid[])`, [
      [adminId, removedAdminId],
    ]);
    await pool.query(`delete from public.profiles where id = any($1::uuid[])`, [
      [adminId, plainUserId, removedAdminId],
    ]);
    await pool.query(`delete from auth.users where id = any($1::uuid[])`, [
      [adminId, plainUserId, removedAdminId],
    ]);
    await pool.end();
  });

  describe("access control", () => {
    it("admits an active admin", async () => {
      await expect(guard.canActivate(contextFor(adminId))).resolves.toBe(true);
    });

    it("refuses an ordinary signed-in user", async () => {
      await expect(guard.canActivate(contextFor(plainUserId))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("refuses an admin whose access was withdrawn", async () => {
      // The row still exists with is_active false — checking the database per
      // request is the whole point, since a JWT claim would still say admin.
      await expect(guard.canActivate(contextFor(removedAdminId))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("refuses a request with no authenticated user", async () => {
      await expect(guard.canActivate(contextFor(null))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it("reflects revocation immediately, without waiting for a token refresh", async () => {
      await expect(guard.canActivate(contextFor(adminId))).resolves.toBe(true);

      await pool.query(`update public.admin_users set is_active = false where user_id = $1`, [
        adminId,
      ]);
      await expect(guard.canActivate(contextFor(adminId))).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      await pool.query(`update public.admin_users set is_active = true where user_id = $1`, [
        adminId,
      ]);
      await expect(guard.canActivate(contextFor(adminId))).resolves.toBe(true);
    });
  });

  describe("platform view", () => {
    it("returns dashboard aggregates across every tenant", async () => {
      const dashboard = await service.dashboard();

      expect(Number(dashboard.overview.organizations)).toBeGreaterThan(0);
      expect(Number(dashboard.overview.projects)).toBeGreaterThan(0);
      expect(dashboard.health.database.status).toBe("up");
      expect(dashboard.health.database.latency_ms).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(dashboard.usage)).toBe(true);
      expect(Array.isArray(dashboard.errors)).toBe(true);
    });

    it("lists organizations with usage but without their content", async () => {
      const { items } = await service.organizations();
      const org = items.find((o: { id: string }) => o.id === orgId);

      expect(org).toBeTruthy();
      expect(Number(org.projects)).toBe(1);
      // Aggregates only — no project titles, scripts or research leak here.
      expect(Object.keys(org)).not.toContain("title");
      expect(Object.keys(org)).not.toContain("content");
    });

    it("computes an AI failure rate without dividing by zero", async () => {
      const health = await service.health();
      expect(health.ai.failure_rate).toBeGreaterThanOrEqual(0);
      expect(health.ai.failure_rate).toBeLessThanOrEqual(1);
      expect(Number.isNaN(health.ai.failure_rate)).toBe(false);
    });
  });

  describe("feature flags", () => {
    it("creates a flag and updates it on a second write rather than duplicating", async () => {
      const created = await service.upsertFlag({
        name: "test_flag_alpha",
        description: "First write",
        enabled: false,
      });
      expect(created.enabled).toBe(false);

      const updated = await service.upsertFlag({
        name: "test_flag_alpha",
        enabled: true,
        rollout_percentage: 25,
      });
      expect(updated.id).toBe(created.id);
      expect(updated.enabled).toBe(true);
      expect(updated.rollout_percentage).toBe(25);
      // A field left out of the update keeps its value.
      expect(updated.description).toBe("First write");

      const { items } = await service.listFlags();
      expect(items.filter((f: { name: string }) => f.name === "test_flag_alpha")).toHaveLength(1);

      await service.deleteFlag(created.id);
    });

    it("reports a missing flag rather than silently succeeding", async () => {
      await expect(service.deleteFlag(randomUUID())).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("announcements", () => {
    it("creates an announcement and toggles it off", async () => {
      const created = await service.createAnnouncement(adminId, {
        title: "Test Maintenance",
        message: "Scheduled maintenance tonight.",
        severity: "warning",
      });
      expect(created.is_active).toBe(true);
      expect(created.severity).toBe("warning");

      const disabled = await service.setAnnouncementActive(created.id, false);
      expect(disabled.is_active).toBe(false);
    });

    it("reports a missing announcement", async () => {
      await expect(
        service.setAnnouncementActive(randomUUID(), true),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
