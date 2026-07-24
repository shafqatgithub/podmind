import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { CalendarModule } from "../src/calendar/calendar.module";
import { CalendarService } from "../src/calendar/calendar.service";
import { AgentService } from "../src/agents/agent.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Content calendar", () => {
  let service: CalendarService;
  let pool: Pool;
  let tenant: TenantContext;

  const agents = { createRun: jest.fn() };

  const ownerId = randomUUID();
  const orgId = randomUUID();
  let workspaceId: string;
  let projectId: string;
  let guestId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        CalendarModule,
      ],
    })
      .overrideProvider(AgentService)
      .useValue(agents)
      .compile();

    service = moduleRef.get(CalendarService);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
      ownerId,
      `cal-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    await pool.query(
      `insert into public.organizations (id,name,slug,owner_id) values ($1,'Cal Org',$2,$3)`,
      [orgId, `cal-${orgId.slice(0, 8)}`, ownerId],
    );
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `cws-${orgId.slice(0, 8)}`, ownerId],
    );
    workspaceId = ws.rows[0]!.id;
    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id, owner_id, title)
       values ($1,$2,'Calendar Project') returning id`,
      [workspaceId, ownerId],
    );
    projectId = project.rows[0]!.id;
    const guest = await pool.query<{ id: string }>(
      `insert into public.guests (project_id, created_by, full_name)
       values ($1,$2,'Scheduled Guest') returning id`,
      [projectId, ownerId],
    );
    guestId = guest.rows[0]!.id;

    tenant = { userId: ownerId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(`delete from public.content_calendar where project_id = $1`, [projectId]);
    await pool.query(`delete from public.ai_agent_sessions where project_id = $1`, [projectId]);
    await pool.query(`delete from public.guests where project_id = $1`, [projectId]);
    await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = $1`, [orgId]);
    await pool.query(`delete from auth.users where id = $1`, [ownerId]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`delete from public.content_calendar where project_id = $1`, [projectId]);
    // agent_session_id is a real foreign key, so the mock has to produce a
    // real row — otherwise the test passes against a constraint production
    // would hit.
    agents.createRun = jest.fn(async () => {
      const { rows } = await pool.query<{ id: string }>(
        `insert into public.ai_agent_sessions (project_id, started_by, session_name, status)
         values ($1,$2,'Test run','running') returning id`,
        [projectId, ownerId],
      );
      return { id: rows[0]!.id };
    });
  });

  const day = (entry: { scheduled_for: string | Date }) =>
    new Date(entry.scheduled_for).toISOString().slice(0, 10);

  it("creates an entry and reads it back in a window", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Episode one",
      topic: "The attention economy",
      scheduled_for: "2026-08-03",
      publish_at: "2026-08-10",
      guest_id: guestId,
    });

    expect(entry.title).toBe("Episode one");
    expect(entry.status).toBe("planned");
    // The guest name is joined in, so the calendar does not need a second call.
    expect(entry.guest_name).toBe("Scheduled Guest");

    const page = await service.list(tenant, {
      project_id: projectId,
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(page.items).toHaveLength(1);
  });

  it("rejects publishing before recording", async () => {
    await expect(
      service.create(tenant, {
        project_id: projectId,
        title: "Backwards",
        scheduled_for: "2026-08-10",
        publish_at: "2026-08-03",
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lays a plan across a weekly cadence with a publish offset", async () => {
    const result = await service.plan(tenant, {
      project_id: projectId,
      start_date: "2026-08-03",
      cadence: "weekly",
      publish_offset_days: 4,
      items: [{ title: "One" }, { title: "Two" }, { title: "Three" }],
    });

    expect(result.created).toBe(3);

    const page = await service.list(tenant, {
      project_id: projectId,
      from: "2026-08-01",
      to: "2026-09-30",
    });
    expect(page.items.map(day)).toEqual(["2026-08-03", "2026-08-10", "2026-08-17"]);
    // Offset is 4 days from the recording date, not the next slot.
    expect(new Date(page.items[0]!.publish_at!).toISOString().slice(0, 10)).toBe("2026-08-07");
  });

  it("steps a monthly cadence across a month boundary correctly", async () => {
    await service.plan(tenant, {
      project_id: projectId,
      start_date: "2026-01-30",
      cadence: "monthly",
      items: [{ title: "Jan" }, { title: "Feb" }],
    });

    const page = await service.list(tenant, {
      project_id: projectId,
      from: "2026-01-01",
      to: "2026-04-30",
    });
    // 28 days from 30 Jan is 27 Feb — arithmetic, not calendar-month guessing.
    expect(page.items.map(day)).toEqual(["2026-01-30", "2026-02-27"]);
  });

  it("defaults to the current month when no window is given", async () => {
    const page = await service.list(tenant, { project_id: projectId });
    const now = new Date();
    expect(page.from.slice(0, 7)).toBe(now.toISOString().slice(0, 7));
    expect(page.to.slice(0, 7)).toBe(now.toISOString().slice(0, 7));
  });

  it("moves an entry and updates its status", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Movable",
      scheduled_for: "2026-08-03",
    });

    const moved = await service.update(tenant, entry.id, {
      scheduled_for: "2026-08-05",
      status: "recording",
    });
    expect(day(moved)).toBe("2026-08-05");
    expect(moved.status).toBe("recording");
  });

  it("rejects a move that would put publishing before recording", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Has publish date",
      scheduled_for: "2026-08-03",
      publish_at: "2026-08-05",
    });

    await expect(
      service.update(tenant, entry.id, { scheduled_for: "2026-08-20" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("runs the pipeline for a slot and links the run to it", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Runnable",
      topic: "The attention economy",
      scheduled_for: "2026-08-03",
      guest_id: guestId,
    });

    const updated = await service.runPipeline(tenant, entry.id);

    expect(agents.createRun).toHaveBeenCalledTimes(1);
    const [, dto] = agents.createRun.mock.calls[0]!;
    expect(dto).toMatchObject({
      project_id: projectId,
      topic: "The attention economy",
      guest_name: "Scheduled Guest",
    });

    // The slot now points at the work, rather than merely describing it.
    expect(updated.agent_session_id).toBeTruthy();
    expect(updated.status).toBe("researching");
  });

  it("uses the title as the topic when none was given", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Title doubles as topic",
      scheduled_for: "2026-08-03",
    });
    await service.runPipeline(tenant, entry.id);

    const [, dto] = agents.createRun.mock.calls[0]!;
    expect(dto.topic).toBe("Title doubles as topic");
  });

  it("keeps entries inside their tenant", async () => {
    await expect(
      service.create(tenant, {
        project_id: randomUUID(),
        title: "Not mine",
        scheduled_for: "2026-08-03",
      }),
    ).rejects.toMatchObject({ status: 404 });

    await expect(service.update(tenant, randomUUID(), { title: "x" })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.remove(tenant, randomUUID())).rejects.toMatchObject({ status: 404 });
  });

  it("deletes an entry", async () => {
    const entry = await service.create(tenant, {
      project_id: projectId,
      title: "Deletable",
      scheduled_for: "2026-08-03",
    });
    await service.remove(tenant, entry.id);

    const page = await service.list(tenant, {
      project_id: projectId,
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(page.items).toHaveLength(0);
  });
});
