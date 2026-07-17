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
 * Auth contract, end-to-end with real cryptography and a real database:
 *  - ES256 keypair generated per run; guard verifies against its JWKS
 *  - a real auth.users + profiles row is created (signup trigger parity)
 *  - /me returns the profile; bad/absent/expired tokens get 401 envelopes
 */
describe("Authentication (e2e)", () => {
  let app: INestApplication;
  let pool: Pool;
  let privateKey: import("jose").KeyLike;
  const userId = randomUUID();
  const email = `e2e-${userId.slice(0, 8)}@podmind.test`;

  const signToken = (overrides: Record<string, unknown> = {}, expiresIn: string | number = "10m") =>
    new SignJWT({ email, aud: "authenticated", ...overrides })
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setSubject(String(overrides.sub ?? userId))
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey);

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256");
    privateKey = pair.privateKey;
    const jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "ES256" };
    const localJwks = createLocalJWKSet({ keys: [jwk] });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Point the guard at our local JWKS (test seam).
    moduleRef.get(SupabaseAuthGuard).setKeyResolver(localJwks);

    // Real user via the same path production uses: auth.users insert fires
    // the live signup trigger which provisions public.profiles.
    pool = moduleRef.get<Pool>(PG_POOL);
    await pool.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       values ($1, $2, '{"full_name": "E2E Tester"}'::jsonb)`,
      [userId, email],
    );
  });

  afterAll(async () => {
    await pool.query(`delete from auth.users where id = $1`, [userId]);
    await app.close();
  });

  it("signup trigger provisioned the profile", async () => {
    const { rows } = await pool.query(`select email, full_name from public.profiles where id = $1`, [
      userId,
    ]);
    expect(rows[0]).toMatchObject({ email, full_name: "E2E Tester" });
  });

  it("GET /api/v1/me with a valid token returns the profile envelope", async () => {
    const token = await signToken();
    const res = await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: userId, email, full_name: "E2E Tester" });
    expect(res.body.version).toBe("v1");
  });

  it("rejects a missing token with the 401 error envelope", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/me").expect(401);
    expect(res.body).toMatchObject({ success: false, data: null });
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects a tampered token", async () => {
    const token = await signToken();
    await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token.slice(0, -4)}AAAA`)
      .expect(401);
  });

  it("rejects an expired token", async () => {
    const token = await signToken({}, Math.floor(Date.now() / 1000) - 60);
    await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("rejects a wrong-audience token", async () => {
    const token = await signToken({ aud: "not-authenticated" });
    await request(app.getHttpServer())
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(401);
  });

  it("health stays public (no token required)", async () => {
    await request(app.getHttpServer()).get("/api/v1/health").expect(200);
  });
});
