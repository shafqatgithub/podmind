import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { DashboardModule } from "../src/dashboard/dashboard.module";
import { DashboardService } from "../src/dashboard/dashboard.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Dashboard", () => {
  let service: DashboardService;
  let pool: Pool;
  let tenant: TenantContext;

  const ownerId = randomUUID();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        DashboardModule,
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerId,
      `dash-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    for (const id of [orgId, otherOrgId]) {
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, $2, $3, $4)`,
        [id, `Org ${id.slice(0, 4)}`, `dash-${id.slice(0, 8)}`, ownerId],
      );
    }
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id, name, slug, owner_id)
       values ($1, 'WS', $2, $3) returning id`,
      [orgId, `dashws-${orgId.slice(0, 8)}`, ownerId],
    );
    workspaceId = ws.rows[0]!.id;

    // Another organization's workspace and project must never appear.
    const otherWs = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id, name, slug, owner_id)
       values ($1, 'Other WS', $2, $3) returning id`,
      [otherOrgId, `otherws-${otherOrgId.slice(0, 8)}`, ownerId],
    );
    await pool.query(
      `insert into public.projects (workspace_id, owner_id, title)
       values ($1, $2, 'Invisible project')`,
      [otherWs.rows[0]!.id, ownerId],
    );

    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id, owner_id, title, is_favorite)
       values ($1, $2, 'Starred show', true) returning id`,
      [workspaceId, ownerId],
    );
    projectId = project.rows[0]!.id;
    await pool.query(
      `insert into public.projects (workspace_id, owner_id, title) values ($1, $2, 'Plain show')`,
      [workspaceId, ownerId],
    );
    await pool.query(
      `insert into public.projects (workspace_id, owner_id, title, is_archived)
       values ($1, $2, 'Archived show', true)`,
      [workspaceId, ownerId],
    );

    await pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 450, 50, 500)`,
      [orgId],
    );

    // Two research runs this week, one last week — a real trend baseline.
    for (const daysAgo of [1, 2, 9]) {
      const session = await pool.query<{ id: string }>(
        `insert into public.research_sessions (project_id, created_by, title, topic, depth, created_at)
         values ($1, $2, $3, 'topic', 'standard'::research_depth,
                 now() - ($4 || ' days')::interval)
         returning id`,
        [projectId, ownerId, `Research ${daysAgo}d ago`, String(daysAgo)],
      );
      await pool.query(
        `insert into public.research_results (session_id, ai_agent, title, summary, content, confidence_score)
         values ($1, 'research'::ai_agent, 'R', 'summary', 'content', 0.8)`,
        [session.rows[0]!.id],
      );
    }

    const conversation = await pool.query<{ id: string }>(
      `insert into public.ai_conversations (user_id, project_id, title, total_messages)
       values ($1, $2, 'Angles for episode 1', 4) returning id`,
      [ownerId, projectId],
    );
    await pool.query(
      `insert into public.ai_messages (conversation_id, role, content) values ($1, 'user', 'hi')`,
      [conversation.rows[0]!.id],
    );

    tenant = { userId: ownerId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(`delete from public.ai_conversations where user_id = $1`, [ownerId]);
    await pool.query(
      `delete from public.research_sessions where project_id in (
         select id from public.projects where workspace_id = $1)`,
      [workspaceId],
    );
    for (const id of [orgId, otherOrgId]) {
      await pool.query(`delete from public.audit_events where organization_id = $1`, [id]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [id]);
      await pool.query(
        `delete from public.projects where workspace_id in (
           select id from public.workspaces where organization_id = $1)`,
        [id],
      );
      await pool.query(`delete from public.workspaces where organization_id = $1`, [id]);
    }
    await pool.query(`delete from public.organizations where id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from auth.users where id = $1`, [ownerId]);
    await pool.end();
  });

  it("lists recent projects, favourites first, excluding archived and other tenants", async () => {
    const overview = await service.overview(tenant);
    const titles = overview.recent_projects.map((p) => p.title);

    expect(titles[0]).toBe("Starred show");
    expect(titles).toContain("Plain show");
    expect(titles).not.toContain("Archived show");
    expect(titles).not.toContain("Invisible project");
  });

  it("lists recent research with its project and confidence", async () => {
    const overview = await service.overview(tenant);
    expect(overview.recent_research).toHaveLength(3);

    const latest = overview.recent_research[0]!;
    expect(latest.project_title).toBe("Starred show");
    expect(latest.confidence_score).toBeCloseTo(0.8, 2);
    // Newest first.
    expect(latest.title).toBe("Research 1d ago");
  });

  it("compares this week against last rather than reporting a bare count", async () => {
    const overview = await service.overview(tenant);
    expect(overview.weekly.research_this_week).toBe(2);
    expect(overview.weekly.research_last_week).toBe(1);
    expect(overview.weekly.research_trend_pct).toBe(100);
    expect(overview.weekly.messages_this_week).toBe(1);
  });

  it("reports the credit balance", async () => {
    const overview = await service.overview(tenant);
    expect(overview.credits.available).toBe(450);
    expect(overview.credits.used).toBe(50);
  });

  it("lists recent conversations and activity", async () => {
    const overview = await service.overview(tenant);
    expect(overview.recent_conversations[0]!.title).toBe("Angles for episode 1");
    // Project inserts fire the audit trigger, so activity is never empty here.
    expect(overview.recent_activity.length).toBeGreaterThan(0);
    expect(overview.recent_activity[0]!.resource_type).toBeTruthy();
  });

  it("returns empty widgets, not errors, for a brand new organization", async () => {
    const empty = await service.overview({
      userId: randomUUID(),
      organizationId: otherOrgId,
      workspaceId,
    });

    expect(empty.recent_research).toEqual([]);
    expect(empty.recent_conversations).toEqual([]);
    expect(empty.credits).toEqual({ available: 0, used: 0 });
    // No baseline means no trend, rather than a misleading +100%.
    expect(empty.weekly.research_trend_pct).toBeNull();
  });
});
