import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import request from "supertest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { AppModule } from "../src/app.module";
import { SupabaseAuthGuard } from "../src/auth/supabase-auth.guard";
import { PG_POOL } from "../src/database/database.module";

/**
 * Projects module, end to end against the live schema:
 * first-request tenant provisioning, CRUD, tenant isolation between two real
 * users, validation, and keyset pagination.
 */
describe("Projects (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let privateKey: import("jose").KeyLike;

  const alice = randomUUID();
  const bob = randomUUID();
  const tokenFor = (sub: string) =>
    new SignJWT({ email: `${sub.slice(0, 8)}@podmind.test`, aud: "authenticated" })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

  let aliceToken: string;
  let bobToken: string;

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256");
    privateKey = pair.privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "ES256" };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    moduleRef.get(SupabaseAuthGuard).setKeyResolver(createLocalJWKSet({ keys: [jwk] }));

    pool = moduleRef.get<Pool>(PG_POOL);
    for (const id of [alice, bob]) {
      await pool.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, $2, jsonb_build_object('full_name', $3::text))`,
        [id, `${id.slice(0, 8)}@podmind.test`, `User ${id.slice(0, 4)}`],
      );
    }
    aliceToken = await tokenFor(alice);
    bobToken = await tokenFor(bob);
  });

  afterAll(async () => {
    for (const id of [alice, bob]) {
      await pool.query(
        `delete from public.projects
          where workspace_id in (
            select w.id from public.workspaces w
             join public.organizations o on o.id = w.organization_id
            where o.owner_id = $1)`,
        [id],
      );
      await pool.query(
        `delete from public.ai_credit_balances
          where organization_id in (select id from public.organizations where owner_id = $1)`,
        [id],
      );
      // organizations.owner_id has no ON DELETE CASCADE, so tenants must be
      // torn down before the auth user.
      await pool.query(
        `delete from public.audit_events where organization_id in
           (select id from public.organizations where owner_id = $1)`,
        [id],
      );
      await pool.query(
        `delete from public.workspaces where organization_id in
           (select id from public.organizations where owner_id = $1)`,
        [id],
      );
      await pool.query(`delete from public.organizations where owner_id = $1`, [id]);
      await pool.query(`delete from auth.users where id = $1`, [id]);
    }
    await app.close();
  });

  const api = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it("provisions organization, workspace and credits on the first request", async () => {
    const res = await api().get("/api/v1/projects").set(auth(aliceToken)).expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);

    const { rows } = await pool.query<{ org: string; ws: string; credits: number }>(
      `select o.id as org, w.id as ws, b.available_credits as credits
         from public.organizations o
         join public.workspaces w on w.organization_id = o.id and w.is_default
         join public.ai_credit_balances b on b.organization_id = o.id
        where o.owner_id = $1`,
      [alice],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]!.credits).toBeGreaterThan(0);

    // Profile caches the active organization for RLS helpers.
    const { rows: profile } = await pool.query<{ organization_id: string | null }>(
      `select organization_id from public.profiles where id = $1`,
      [alice],
    );
    expect(profile[0]!.organization_id).toBe(rows[0]!.org);
  });

  it("provisioning is idempotent across concurrent requests", async () => {
    await Promise.all(
      Array.from({ length: 5 }, () => api().get("/api/v1/projects").set(auth(bobToken))),
    );
    const { rows } = await pool.query(`select id from public.organizations where owner_id = $1`, [
      bob,
    ]);
    expect(rows).toHaveLength(1);
  });

  let projectId: string;

  it("creates a project with slug and defaults", async () => {
    const res = await api()
      .post("/api/v1/projects")
      .set(auth(aliceToken))
      .send({ title: "The Future of Sleep Science", description: "Season 2 opener" })
      .expect(201);

    projectId = res.body.data.id;
    expect(res.body.data).toMatchObject({
      title: "The Future of Sleep Science",
      status: "draft",
      visibility: "workspace",
      language: "en",
      is_archived: false,
    });
    // The slug is derived from the title. A database that already holds that
    // slug gets a numeric suffix, which is correct behaviour — so assert the
    // derivation rather than global uniqueness, or this passes only against a
    // pristine database and wastes someone's afternoon later.
    expect(res.body.data.slug).toMatch(/^the-future-of-sleep-science(-\d+)?$/);
    expect(res.body.data.owner_id).toBe(alice);
  });

  it("rejects invalid payloads with the documented INVALID_REQUEST error", async () => {
    // 30-API-SDK-Plan error example: {"code": "INVALID_REQUEST", ...} on 400.
    const res = await api()
      .post("/api/v1/projects")
      .set(auth(aliceToken))
      .send({ title: "", status: "not-a-status" })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INVALID_REQUEST");
    expect(res.body.error.details.errors.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields (no silent drops)", async () => {
    await api()
      .post("/api/v1/projects")
      .set(auth(aliceToken))
      .send({ title: "Legit", owner_id: bob })
      .expect(400);
  });

  it("updates status and favourite flag", async () => {
    const res = await api()
      .patch(`/api/v1/projects/${projectId}`)
      .set(auth(aliceToken))
      .send({ status: "research", is_favorite: true })
      .expect(200);
    expect(res.body.data).toMatchObject({ status: "research", is_favorite: true });
  });

  it("filters by status, favourites and search", async () => {
    await api()
      .post("/api/v1/projects")
      .set(auth(aliceToken))
      .send({ title: "Deep Work Habits" })
      .expect(201);

    const byStatus = await api()
      .get("/api/v1/projects?status=research")
      .set(auth(aliceToken))
      .expect(200);
    expect(byStatus.body.data.items).toHaveLength(1);

    const favourites = await api()
      .get("/api/v1/projects?favorites_only=true")
      .set(auth(aliceToken))
      .expect(200);
    expect(favourites.body.data.items).toHaveLength(1);

    const search = await api()
      .get("/api/v1/projects?search=Deep")
      .set(auth(aliceToken))
      .expect(200);
    expect(search.body.data.items[0].title).toBe("Deep Work Habits");
  });

  it("paginates with a stable cursor", async () => {
    const page1 = await api().get("/api/v1/projects?limit=1").set(auth(aliceToken)).expect(200);
    expect(page1.body.data.items).toHaveLength(1);
    expect(page1.body.data.has_more).toBe(true);

    const page2 = await api()
      .get(`/api/v1/projects?limit=1&cursor=${encodeURIComponent(page1.body.data.next_cursor)}`)
      .set(auth(aliceToken))
      .expect(200);
    expect(page2.body.data.items[0].id).not.toBe(page1.body.data.items[0].id);
  });

  it("reports stats for the tenant", async () => {
    const res = await api().get("/api/v1/projects/stats").set(auth(aliceToken)).expect(200);
    expect(res.body.data).toMatchObject({ total: 2, active: 2, favorites: 1 });
  });

  it("isolates tenants: Bob cannot see, read or modify Alice's project", async () => {
    const bobList = await api().get("/api/v1/projects").set(auth(bobToken)).expect(200);
    expect(bobList.body.data.items).toEqual([]);

    await api().get(`/api/v1/projects/${projectId}`).set(auth(bobToken)).expect(404);
    await api()
      .patch(`/api/v1/projects/${projectId}`)
      .set(auth(bobToken))
      .send({ title: "hijacked" })
      .expect(404);
    await api().delete(`/api/v1/projects/${projectId}`).set(auth(bobToken)).expect(404);

    // Alice's project is untouched.
    const still = await api()
      .get(`/api/v1/projects/${projectId}`)
      .set(auth(aliceToken))
      .expect(200);
    expect(still.body.data.title).toBe("The Future of Sleep Science");
  });

  it("requires authentication", async () => {
    await api().get("/api/v1/projects").expect(401);
  });

  it("deletes a project", async () => {
    await api().delete(`/api/v1/projects/${projectId}`).set(auth(aliceToken)).expect(204);
    await api().get(`/api/v1/projects/${projectId}`).set(auth(aliceToken)).expect(404);
  });
});
