import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { MemoryModule } from "../src/memory/memory.module";
import { NotificationModule } from "../src/notifications/notification.module";
import { MemoryService } from "../src/memory/memory.service";
import { NotificationService } from "../src/notifications/notification.service";
import { NotificationRepository } from "../src/notifications/notification.repository";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Memory and Notifications", () => {
  let memory: MemoryService;
  let notifications: NotificationService;
  let notificationRepo: NotificationRepository;
  let pool: Pool;

  const userId = randomUUID();
  const otherUserId = randomUUID();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  let workspaceId: string;
  let projectId: string;
  let foreignProjectId: string;
  let tenant: TenantContext;
  let otherTenant: TenantContext;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        MemoryModule,
        NotificationModule,
      ],
    }).compile();

    memory = moduleRef.get(MemoryService);
    notifications = moduleRef.get(NotificationService);
    notificationRepo = moduleRef.get(NotificationRepository);
    pool = moduleRef.get<Pool>(PG_POOL);

    for (const [id, org, label] of [
      [userId, orgId, "mem"],
      [otherUserId, otherOrgId, "other"],
    ] as const) {
      await pool.query(`insert into auth.users (id,email) values ($1,$2)`, [
        id,
        `${label}-${id.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,$2,$3,$4)`,
        [org, `${label} Org`, `${label}-${org.slice(0, 8)}`, id],
      );
    }

    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `memws-${orgId.slice(0, 8)}`, userId],
    );
    workspaceId = ws.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id,owner_id,title) values ($1,$2,'Mem Project') returning id`,
      [workspaceId, userId],
    );
    projectId = project.rows[0]!.id;

    const otherWs = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [otherOrgId, `otherws-${otherOrgId.slice(0, 8)}`, otherUserId],
    );
    const otherProject = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id,owner_id,title) values ($1,$2,'Theirs') returning id`,
      [otherWs.rows[0]!.id, otherUserId],
    );
    foreignProjectId = otherProject.rows[0]!.id;

    tenant = { userId, organizationId: orgId, workspaceId };
    otherTenant = { userId: otherUserId, organizationId: otherOrgId, workspaceId: otherWs.rows[0]!.id };
  });

  afterAll(async () => {
    await pool.query(`delete from public.ai_memories where user_id = any($1::uuid[])`, [
      [userId, otherUserId],
    ]);
    await pool.query(`delete from public.notifications where user_id = any($1::uuid[])`, [
      [userId, otherUserId],
    ]);
    await pool.query(`delete from public.notification_preferences where user_id = any($1::uuid[])`, [
      [userId, otherUserId],
    ]);
    await pool.query(`delete from public.projects where id = any($1::uuid[])`, [
      [projectId, foreignProjectId],
    ]);
    await pool.query(`delete from public.audit_events where organization_id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from public.workspaces where organization_id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from public.organizations where id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from auth.users where id = any($1::uuid[])`, [[userId, otherUserId]]);
    await pool.end();
  });

  describe("memory", () => {
    it("stores a memory with the documented type and default importance", async () => {
      const created = await memory.create(tenant, {
        memory_type: "preference",
        title: "Prefers short intros",
        content: "Keep the cold open under 45 seconds.",
      });
      expect(created.memory_type).toBe("preference");
      expect(created.importance).toBe(5);
      expect(created.source).toBe("user");
    });

    it("orders by importance so the strongest instructions surface first", async () => {
      await memory.create(tenant, {
        memory_type: "instruction",
        title: "Never use hype words",
        content: "Avoid 'game-changing' and 'revolutionary'.",
        importance: 10,
      });
      const { items } = await memory.list(tenant, {});
      expect(items[0]!.title).toBe("Never use hype words");
    });

    it("filters by type and search", async () => {
      const byType = await memory.list(tenant, { memory_type: "instruction" });
      expect(byType.items.every((m: { memory_type: string }) => m.memory_type === "instruction")).toBe(true);

      const bySearch = await memory.list(tenant, { search: "cold open" });
      expect(bySearch.items).toHaveLength(1);
    });

    it("reports counts by type", async () => {
      const { stats } = await memory.list(tenant, {});
      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.by_type.some((t: { memory_type: string }) => t.memory_type === "preference")).toBe(true);
    });

    it("rejects attaching a memory to another tenant's project", async () => {
      await expect(
        memory.create(tenant, {
          memory_type: "fact",
          title: "x",
          content: "y",
          project_id: foreignProjectId,
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("never returns another user's memories", async () => {
      await memory.create(otherTenant, {
        memory_type: "fact",
        title: "Their private memory",
        content: "Should never be visible.",
      });

      const { items } = await memory.list(tenant, {});
      expect(items.some((m: { title: string }) => m.title === "Their private memory")).toBe(false);
    });

    it("refuses to read, update or delete a memory belonging to someone else", async () => {
      const theirs = await memory.create(otherTenant, {
        memory_type: "fact",
        title: "Also theirs",
        content: "Private.",
      });

      await expect(memory.findOne(tenant, theirs.id)).rejects.toMatchObject({ status: 404 });
      await expect(memory.update(tenant, theirs.id, { title: "hijacked" })).rejects.toMatchObject({
        status: 404,
      });
      await expect(memory.remove(tenant, theirs.id)).rejects.toMatchObject({ status: 404 });
    });

    it("updates and deletes its own memories", async () => {
      const created = await memory.create(tenant, {
        memory_type: "context",
        title: "Temporary",
        content: "To be changed.",
      });
      const updated = await memory.update(tenant, created.id, {
        title: "Changed",
        importance: 8,
      });
      expect(updated.title).toBe("Changed");
      expect(updated.importance).toBe(8);

      await memory.remove(tenant, created.id);
      await expect(memory.findOne(tenant, created.id)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("notifications", () => {
    it("emits and lists with an unread count", async () => {
      await notificationRepo.emit({
        userId,
        organizationId: orgId,
        type: "research",
        title: "Research finished",
        message: "Your briefing is ready.",
      });

      const { items, unread_count } = await notifications.list(tenant, {});
      expect(items).toHaveLength(1);
      expect(unread_count).toBe(1);
      expect(items[0]!.type).toBe("research");
    });

    it("marks one and then all as read", async () => {
      await notificationRepo.emit({ userId, type: "system", title: "A", message: "a" });
      await notificationRepo.emit({ userId, type: "system", title: "B", message: "b" });

      const { items } = await notifications.list(tenant, { unread_only: true });
      await notifications.markRead(tenant, items[0]!.id);
      expect((await notifications.list(tenant, {})).unread_count).toBe(items.length - 1);

      const result = await notifications.markAllRead(tenant);
      expect(result.marked).toBeGreaterThan(0);
      expect((await notifications.list(tenant, {})).unread_count).toBe(0);
    });

    it("never exposes another user's notifications", async () => {
      await notificationRepo.emit({
        userId: otherUserId,
        type: "system",
        title: "Their notification",
        message: "private",
      });

      const { items } = await notifications.list(tenant, {});
      expect(items.some((n: { title: string }) => n.title === "Their notification")).toBe(false);

      const theirs = await notifications.list(otherTenant, {});
      await expect(
        notifications.markRead(tenant, theirs.items[0]!.id),
      ).rejects.toMatchObject({ status: 404 });
      await expect(notifications.remove(tenant, theirs.items[0]!.id)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("provisions preferences on first read and updates only offered fields", async () => {
      const prefs = await notifications.getPreferences(tenant);
      expect(prefs).toHaveProperty("in_app_enabled");

      const updated = await notifications.updatePreferences(tenant, {
        email_enabled: false,
        quiet_hours_enabled: true,
        timezone: "Asia/Karachi",
      });
      expect(updated.email_enabled).toBe(false);
      expect(updated.quiet_hours_enabled).toBe(true);
      expect(updated.timezone).toBe("Asia/Karachi");
    });

    it("never fails the caller when writing a notification fails", async () => {
      // An invalid type would throw at the database; notify must swallow it,
      // because a notification is never worth failing the real action for.
      await expect(
        notifications.notify({
          userId,
          type: "not-a-real-type",
          title: "x",
          message: "y",
        }),
      ).resolves.toBeUndefined();
    });
  });
});
