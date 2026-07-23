import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { AgentModule } from "../src/agents/agent.module";
import { AgentService } from "../src/agents/agent.service";
import { AgentRepository } from "../src/agents/agent.repository";
import { ResearchService } from "../src/research/research.service";
import { OutlineService } from "../src/outlines/outline.service";
import { ScriptService } from "../src/scripts/script.service";
import { SeoService } from "../src/seo/seo.service";
import { SocialService } from "../src/social/social.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

/** Waits for the background pipeline to settle. */
async function waitForRun(
  service: AgentService,
  tenant: TenantContext,
  id: string,
  timeoutMs = 8000,
) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const run = await service.findOne(tenant, id);
    if (run.status !== "running") return run;
    if (Date.now() > deadline) throw new Error(`run ${id} did not settle`);
    await new Promise((r) => setTimeout(r, 40));
  }
}

describe("AI Agents pipeline", () => {
  let service: AgentService;
  let pool: Pool;
  let tenant: TenantContext;

  const calls: string[] = [];
  const research = { create: jest.fn() };
  const outlines = { create: jest.fn() };
  const scripts = { create: jest.fn() };
  const seo = { create: jest.fn() };
  const social = { create: jest.fn() };

  const ownerId = randomUUID();
  const orgId = randomUUID();
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        AgentModule,
      ],
    })
      .overrideProvider(ResearchService)
      .useValue(research)
      .overrideProvider(OutlineService)
      .useValue(outlines)
      .overrideProvider(ScriptService)
      .useValue(scripts)
      .overrideProvider(SeoService)
      .useValue(seo)
      .overrideProvider(SocialService)
      .useValue(social)
      .compile();

    service = moduleRef.get(AgentService);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
      ownerId,
      `agent-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    await pool.query(
      `insert into public.organizations (id,name,slug,owner_id) values ($1,'Agent Org',$2,$3)`,
      [orgId, `agent-${orgId.slice(0, 8)}`, ownerId],
    );
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `aws-${orgId.slice(0, 8)}`, ownerId],
    );
    workspaceId = ws.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id, owner_id, title)
       values ($1,$2,'Pipeline Project') returning id`,
      [workspaceId, ownerId],
    );
    projectId = project.rows[0]!.id;

    tenant = { userId: ownerId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(
      `delete from public.ai_agent_tasks where session_id in
         (select id from public.ai_agent_sessions where project_id = $1)`,
      [projectId],
    );
    await pool.query(`delete from public.ai_agent_sessions where project_id = $1`, [projectId]);
    await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = $1`, [orgId]);
    await pool.query(`delete from auth.users where id = $1`, [ownerId]);
    await pool.end();
  });

  beforeEach(() => {
    calls.length = 0;
    const ok = (name: string, payload: Record<string, unknown>) =>
      jest.fn(() => {
        calls.push(name);
        return Promise.resolve(payload);
      });

    research.create = ok("research", { id: randomUUID(), title: "R" });
    outlines.create = ok("outline", { id: randomUUID(), title: "O" });
    scripts.create = ok("script", { id: randomUUID(), title: "S" });
    seo.create = ok("seo", { id: randomUUID() });
    social.create = ok("social", { id: randomUUID() });
  });

  it("runs the whole pipeline in dependency order and feeds each step forward", async () => {
    const started = await service.createRun(tenant, {
      project_id: projectId,
      topic: "The attention economy",
      steps: ["social", "research", "script", "outline", "seo"], // deliberately shuffled
      duration_minutes: 30,
    });

    // The request returns immediately, before the work is done.
    expect(started.tasks).toHaveLength(5);

    const run = await waitForRun(service, tenant, started.id);
    expect(run.status).toBe("completed");
    expect(calls).toEqual(["research", "outline", "script", "seo", "social"]);

    // Each step received the previous step's artifact.
    expect(outlines.create.mock.calls[0]![1]).toHaveProperty("research_session_id");
    expect(scripts.create.mock.calls[0]![1]).toHaveProperty("outline_id");
    expect(seo.create.mock.calls[0]![1]).toHaveProperty("script_id");
    expect(social.create.mock.calls[0]![1]).toHaveProperty("script_id");

    expect(run.tasks.every((t) => t.status === "completed")).toBe(true);
    expect(run.tasks.every((t) => (t.execution_time_ms ?? 0) >= 0)).toBe(true);
  });

  it("runs only the selected steps", async () => {
    const started = await service.createRun(tenant, {
      project_id: projectId,
      topic: "Just research and an outline",
      steps: ["research", "outline"],
    });
    const run = await waitForRun(service, tenant, started.id);

    expect(run.status).toBe("completed");
    expect(calls).toEqual(["research", "outline"]);
    expect(run.tasks).toHaveLength(2);
  });

  it("keeps earlier work when a later step fails, and reports the run as partial", async () => {
    scripts.create = jest.fn(() => {
      calls.push("script");
      return Promise.reject(new Error("model exploded"));
    });

    const started = await service.createRun(tenant, {
      project_id: projectId,
      topic: "Script fails midway",
      steps: ["research", "outline", "script"],
    });
    const run = await waitForRun(service, tenant, started.id);

    expect(run.status).toBe("partial");
    const byType = Object.fromEntries(run.tasks.map((t) => [t.task_type, t]));
    expect(byType.research!.status).toBe("completed");
    expect(byType.outline!.status).toBe("completed");
    expect(byType.script!.status).toBe("failed");
    expect(byType.script!.error_message).toContain("model exploded");
  });

  it("skips a step whose input never materialised rather than running it on nothing", async () => {
    scripts.create = jest.fn(() => Promise.reject(new Error("script failed")));

    const started = await service.createRun(tenant, {
      project_id: projectId,
      topic: "SEO depends on the script",
      steps: ["script", "seo", "social"],
    });
    const run = await waitForRun(service, tenant, started.id);

    const byType = Object.fromEntries(run.tasks.map((t) => [t.task_type, t]));
    expect(byType.script!.status).toBe("failed");
    expect(byType.seo!.status).toBe("skipped");
    expect(byType.seo!.error_message).toMatch(/script step did not complete/i);
    expect(seo.create).not.toHaveBeenCalled();
    expect(social.create).not.toHaveBeenCalled();
  });

  it("stops the whole run when credits run out instead of failing every step in turn", async () => {
    outlines.create = jest.fn(() =>
      Promise.reject(new Error("INSUFFICIENT_CREDITS: not enough AI credits")),
    );

    const started = await service.createRun(tenant, {
      project_id: projectId,
      topic: "Out of credits",
      steps: ["research", "outline", "script", "seo"],
    });
    const run = await waitForRun(service, tenant, started.id);

    const byType = Object.fromEntries(run.tasks.map((t) => [t.task_type, t]));
    expect(byType.research!.status).toBe("completed");
    expect(byType.outline!.status).toBe("failed");
    expect(byType.script!.status).toBe("skipped");
    expect(byType.script!.error_message).toMatch(/credits/i);
    // The later steps were never attempted.
    expect(scripts.create).not.toHaveBeenCalled();
  });

  it("lists runs and rejects a project from another tenant", async () => {
    const list = await service.list(tenant, projectId);
    expect(list.items.length).toBeGreaterThan(0);
    expect(Number(list.items[0]!.total_tasks)).toBeGreaterThan(0);

    await expect(
      service.createRun(tenant, {
        project_id: randomUUID(),
        topic: "Not mine",
        steps: ["research"],
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("reports interrupted runs as failed rather than leaving them spinning", async () => {
    const repository = new AgentRepository(pool);
    const session = await repository.createSession(tenant, {
      projectId,
      name: "Stale run",
      metadata: {},
    });
    const agents = await repository.agentIdBySlug();
    const task = await repository.createTask({
      sessionId: session.id,
      agentId: agents.get("research-agent") ?? null,
      name: "Research",
      type: "research",
      priority: 0,
    });

    // Age both rows past the cutoff.
    await pool.query(
      `update public.ai_agent_sessions set started_at = now() - interval '2 hours' where id = $1`,
      [session.id],
    );
    await pool.query(
      `update public.ai_agent_tasks set created_at = now() - interval '2 hours' where id = $1`,
      [task.id],
    );

    await repository.reapStaleRuns();

    const run = await service.findOne(tenant, session.id);
    expect(run.status).toBe("failed");
    expect(run.tasks[0]!.status).toBe("failed");
    expect(run.tasks[0]!.error_message).toMatch(/restarted/i);
  });
});
