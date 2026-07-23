import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { BillingModule } from "../src/billing/billing.module";
import { ApiKeyModule } from "../src/api-keys/api-key.module";
import { BillingService } from "../src/billing/billing.service";
import { ApiKeyService } from "../src/api-keys/api-key.service";
import { ApiKeyRepository } from "../src/api-keys/api-key.repository";
import type { TenantContext } from "../src/tenancy/tenancy.service";

describe("Billing and API keys", () => {
  let billing: BillingService;
  let apiKeys: ApiKeyService;
  let apiKeyRepo: ApiKeyRepository;
  let pool: Pool;

  const userId = randomUUID();
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  let tenant: TenantContext;
  let otherTenant: TenantContext;
  let workspaceId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        TenancyModule,
        BillingModule,
        ApiKeyModule,
      ],
    }).compile();

    billing = moduleRef.get(BillingService);
    apiKeys = moduleRef.get(ApiKeyService);
    apiKeyRepo = moduleRef.get(ApiKeyRepository);
    pool = moduleRef.get<Pool>(PG_POOL);

    await pool.query(`insert into auth.users (id,email) values ($1,$2)`, [
      userId,
      `billing-${userId.slice(0, 8)}@podmind.test`,
    ]);
    for (const [id, label] of [
      [orgId, "billing"],
      [otherOrgId, "otherbill"],
    ] as const) {
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,$2,$3,$4)`,
        [id, `${label} Org`, `${label}-${id.slice(0, 8)}`, userId],
      );
    }
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id,name,slug,owner_id)
       values ($1,'WS',$2,$3) returning id`,
      [orgId, `bws-${orgId.slice(0, 8)}`, userId],
    );
    workspaceId = ws.rows[0]!.id;
    await pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 437, 63, 500)`,
      [orgId],
    );

    tenant = { userId, organizationId: orgId, workspaceId };
    otherTenant = { userId, organizationId: otherOrgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(`delete from public.api_keys where organization_id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from public.invoices where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.audit_events where organization_id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = any($1::uuid[])`, [
      [orgId, otherOrgId],
    ]);
    await pool.query(`delete from auth.users where id = $1`, [userId]);
    await pool.end();
  });

  describe("billing", () => {
    it("lists only public, active plans", async () => {
      const plans = await billing.listPlans();
      expect(plans.length).toBeGreaterThan(0);
      expect(plans.every((p: { slug: string }) => typeof p.slug === "string")).toBe(true);
    });

    it("states free tier explicitly rather than returning a bare null", async () => {
      const overview = await billing.overview(tenant);
      expect(overview.subscription).toBeNull();
      expect(overview.is_free_tier).toBe(true);
    });

    it("reports the real credit balance and ledger", async () => {
      const overview = await billing.overview(tenant);
      expect(Number(overview.credits.available_credits)).toBe(437);
      expect(Number(overview.credits.used_credits)).toBe(63);
      expect(Array.isArray(overview.transactions)).toBe(true);
    });

    it("says whether payments can actually be taken", async () => {
      const overview = await billing.overview(tenant);
      // No Stripe key is configured in the test environment.
      expect(overview.payments_enabled).toBe(false);
    });

    it("never shows another organization's invoices", async () => {
      await pool.query(
        `insert into public.invoices (organization_id, invoice_number, amount, currency, status)
         values ($1,'INV-OTHER',10,'USD','paid')`,
        [otherOrgId],
      );
      const overview = await billing.overview(tenant);
      expect(
        overview.invoices.some((i: { invoice_number: string }) => i.invoice_number === "INV-OTHER"),
      ).toBe(false);

      await pool.query(`delete from public.invoices where organization_id = $1`, [otherOrgId]);
    });
  });

  describe("api keys", () => {
    it("returns the secret once and stores only its hash", async () => {
      const created = await apiKeys.create(tenant, { name: "CI key" });

      expect(created.secret).toMatch(/^pmk_/);
      expect(created.key_prefix).toBe(created.secret.slice(0, 12));

      // The plaintext must not be recoverable from the database.
      const { rows } = await pool.query<{ hashed_key: string }>(
        `select hashed_key from public.api_keys where id = $1`,
        [created.id],
      );
      expect(rows[0]!.hashed_key).not.toBe(created.secret);
      expect(rows[0]!.hashed_key).toBe(ApiKeyRepository.hash(created.secret));

      // Listing never exposes the secret.
      const { items } = await apiKeys.list(tenant);
      const listed = items.find((k: { id: string }) => k.id === created.id);
      expect(listed).toBeDefined();
      expect(listed).not.toHaveProperty("secret");
      expect(listed).not.toHaveProperty("hashed_key");
    });

    it("verifies a valid key and records when it was used", async () => {
      const created = await apiKeys.create(tenant, {
        name: "Verify key",
        permissions: ["projects:read"],
      });

      const verified = await apiKeyRepo.verify(created.secret);
      expect(verified).not.toBeNull();
      expect(verified!.organization_id).toBe(orgId);
      expect(verified!.permissions).toEqual(["projects:read"]);

      const { rows } = await pool.query<{ last_used_at: string | null }>(
        `select last_used_at from public.api_keys where id = $1`,
        [created.id],
      );
      expect(rows[0]!.last_used_at).not.toBeNull();
    });

    it("rejects an unknown, revoked or expired key", async () => {
      expect(await apiKeyRepo.verify("pmk_definitely-not-real")).toBeNull();

      const revoked = await apiKeys.create(tenant, { name: "To revoke" });
      await apiKeys.revoke(tenant, revoked.id);
      expect(await apiKeyRepo.verify(revoked.secret)).toBeNull();

      const expiring = await apiKeys.create(tenant, { name: "Expired", expires_in_days: 1 });
      await pool.query(
        `update public.api_keys set expires_at = now() - interval '1 day' where id = $1`,
        [expiring.id],
      );
      expect(await apiKeyRepo.verify(expiring.secret)).toBeNull();
    });

    it("keeps revoked keys visible so the audit trail survives", async () => {
      const key = await apiKeys.create(tenant, { name: "Audit key" });
      await apiKeys.revoke(tenant, key.id);

      const { items } = await apiKeys.list(tenant);
      const found = items.find((k: { id: string }) => k.id === key.id);
      expect(found).toBeDefined();
      expect(found!.is_active).toBe(false);
    });

    it("never lists, revokes or deletes another organization's keys", async () => {
      const mine = await apiKeys.create(tenant, { name: "Mine" });

      const { items } = await apiKeys.list(otherTenant);
      expect(items.some((k: { id: string }) => k.id === mine.id)).toBe(false);

      await expect(apiKeys.revoke(otherTenant, mine.id)).rejects.toMatchObject({ status: 404 });
      await expect(apiKeys.remove(otherTenant, mine.id)).rejects.toMatchObject({ status: 404 });
    });

    it("applies the documented default rate limit", async () => {
      const key = await apiKeys.create(tenant, { name: "Default limit" });
      expect(key.rate_limit_per_minute).toBe(60);
    });
  });
});
