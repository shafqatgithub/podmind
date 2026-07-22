import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { AnalyticsModule } from "../src/analytics/analytics.module";
import { AnalyticsService } from "../src/analytics/analytics.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Analytics", () => {
  let service: AnalyticsService;
  let pool: Pool;
  let tenant: TenantContext;

  const ownerId = randomUUID();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  let workspaceId: string;
  let projectId: string;
  let openaiProviderId: string;
  let openaiModelId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        AnalyticsModule,
      ],
    }).compile();

    service = moduleRef.get(AnalyticsService);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerId,
      `analytics-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    for (const [id, name] of [
      [orgId, "Analytics Org"],
      [otherOrgId, "Other Org"],
    ] as const) {
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, $2, $3, $4)`,
        [id, name, `an-${id.slice(0, 8)}`, ownerId],
      );
    }
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id, name, slug, owner_id)
       values ($1, 'WS', $2, $3) returning id`,
      [orgId, `anws-${orgId.slice(0, 8)}`, ownerId],
    );
    workspaceId = ws.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id, owner_id, title)
       values ($1, $2, 'Analytics Project') returning id`,
      [workspaceId, ownerId],
    );
    projectId = project.rows[0]!.id;

    await pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 380, 120, 500)`,
      [orgId],
    );

    const provider = await pool.query<{ id: string }>(
      `select id from public.ai_providers where provider_type = 'openai' limit 1`,
    );
    openaiProviderId = provider.rows[0]!.id;
    const model = await pool.query<{ id: string }>(
      `select id from public.ai_models where provider_id = $1 limit 1`,
      [openaiProviderId],
    );
    openaiModelId = model.rows[0]!.id;

    // Telemetry: two successes and one failure today, one success 40 days ago
    // (outside the 30-day window), plus one row for a different organization.
    const insertRequest = (
      organizationId: string,
      success: boolean,
      tokens: number,
      cost: number,
      latency: number,
      daysAgo: number,
      task = "research",
      error: string | null = null,
    ) =>
      pool.query(
        `insert into public.ai_requests
           (organization_id, project_id, provider_id, model_id, task,
            prompt_tokens, completion_tokens, total_tokens, estimated_cost,
            latency_ms, success, error_message, created_at)
         values ($1,$2,$3,$4,$5::ai_task,$6,$7,$8,$9,$10,$11,$12, now() - ($13 || ' days')::interval)`,
        [
          organizationId,
          organizationId === orgId ? projectId : null,
          openaiProviderId,
          openaiModelId,
          task,
          Math.floor(tokens / 2),
          Math.ceil(tokens / 2),
          tokens,
          cost,
          latency,
          success,
          error,
          String(daysAgo),
        ],
      );

    await insertRequest(orgId, true, 1000, 0.02, 2000, 0);
    await insertRequest(orgId, true, 500, 0.01, 1000, 1, "chat");
    await insertRequest(orgId, false, 0, 0, 300, 0, "research", "provider rejected the API key");
    await insertRequest(orgId, true, 9999, 9.99, 5000, 40); // outside the window
    await insertRequest(otherOrgId, true, 7777, 7.77, 4000, 0); // different tenant

    await pool.query(
      `insert into public.ai_credit_transactions (organization_id, amount, transaction_type, description)
       values ($1, 10, 'usage', 'Research'), ($1, 1, 'usage', 'Chat')`,
      [orgId],
    );

    tenant = { userId: ownerId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    for (const id of [orgId, otherOrgId]) {
      await pool.query(`delete from public.ai_requests where organization_id = $1`, [id]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [id]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [id]);
      await pool.query(`delete from public.audit_events where organization_id = $1`, [id]);
    }
    await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from auth.users where id = $1`, [ownerId]);
    await pool.end();
  });

  it("totals only this organization, only within the window", async () => {
    const overview = await service.overview(tenant, 30);

    // Three rows in window; the 40-day-old row and the other tenant's are excluded.
    expect(overview.totals.requests).toBe(3);
    expect(overview.totals.successes).toBe(2);
    expect(overview.totals.failures).toBe(1);
    expect(overview.totals.tokens).toBe(1500);
    expect(overview.totals.cost).toBeCloseTo(0.03, 4);
    expect(overview.totals.success_rate).toBeCloseTo(2 / 3, 3);
    // Latency averages successful calls only, so failures do not flatter it.
    expect(overview.totals.avg_latency_ms).toBe(1500);
  });

  it("reports the credit balance and content counts", async () => {
    const overview = await service.overview(tenant, 30);
    // The database trigger owns balance arithmetic: seeding 380/120 and then
    // writing 11 credits of usage leaves 369/131. Analytics reads whatever
    // the ledger settled on rather than recomputing it.
    expect(overview.totals.credits_available).toBe(369);
    expect(overview.totals.credits_used).toBe(131);
    expect(overview.totals.projects).toBe(1);
  });

  it("returns a gapless daily series covering the window", async () => {
    const overview = await service.overview(tenant, 7);
    expect(overview.daily).toHaveLength(8); // inclusive of both endpoints

    const days = overview.daily.map((d) => d.day);
    expect([...days].sort()).toEqual(days); // ascending, no gaps

    const totalRequests = overview.daily.reduce((sum, d) => sum + d.requests, 0);
    expect(totalRequests).toBe(3);

    const totalCredits = overview.daily.reduce((sum, d) => sum + d.credits, 0);
    expect(totalCredits).toBe(11);
  });

  it("breaks usage down by provider with success and failure counts", async () => {
    const overview = await service.overview(tenant, 30);
    const openai = overview.providers.find((p) => p.provider === "openai");

    expect(openai).toBeDefined();
    expect(openai!.requests).toBe(3);
    expect(openai!.successes).toBe(2);
    expect(openai!.failures).toBe(1);
    expect(openai!.tokens).toBe(1500);
  });

  it("breaks usage down by task", async () => {
    const overview = await service.overview(tenant, 30);
    const byTask = Object.fromEntries(overview.tasks.map((t) => [t.task, t.requests]));

    expect(byTask.research).toBe(2);
    expect(byTask.chat).toBe(1);
  });

  it("surfaces recent failures with their provider error", async () => {
    const overview = await service.overview(tenant, 30);
    expect(overview.recent_failures).toHaveLength(1);
    expect(overview.recent_failures[0]!.error_message).toMatch(/rejected the API key/);
    expect(overview.recent_failures[0]!.provider).toBe("openai");
  });

  it("reports nothing for an organization with no activity", async () => {
    const empty = await service.overview(
      { userId: ownerId, organizationId: otherOrgId, workspaceId },
      30,
    );
    // The other org has one request but no credits, projects or failures.
    expect(empty.totals.credits_available).toBe(0);
    expect(empty.totals.projects).toBe(0);
    expect(empty.recent_failures).toHaveLength(0);
    expect(empty.totals.success_rate).toBe(1);
  });
});
