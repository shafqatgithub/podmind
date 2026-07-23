import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { createHmac, randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { PaddleModule } from "../src/billing/paddle/paddle.module";
import { PaddleWebhookService } from "../src/billing/paddle/paddle.webhook.service";
import { PaddleRepository } from "../src/billing/paddle/paddle.repository";
import { verifyPaddleSignature } from "../src/billing/paddle/paddle.signature";

const SECRET = "pdl_ntfset_test_secret";

function sign(body: string, secret = SECRET, ts = Math.floor(Date.now() / 1000)): string {
  const hash = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${hash}`;
}

describe("Paddle billing", () => {
  describe("signature verification", () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "transaction.completed" });

    it("accepts a correctly signed payload", () => {
      expect(verifyPaddleSignature(body, sign(body), SECRET).valid).toBe(true);
    });

    it("rejects a payload signed with the wrong secret", () => {
      const result = verifyPaddleSignature(body, sign(body, "wrong_secret"), SECRET);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("signature mismatch");
    });

    it("rejects a body altered after signing", () => {
      const signature = sign(body);
      const tampered = body.replace("evt_1", "evt_2");
      expect(verifyPaddleSignature(tampered, signature, SECRET).valid).toBe(false);
    });

    it("rejects a replayed signature from outside the time window", () => {
      const old = Math.floor(Date.now() / 1000) - 60 * 60;
      const result = verifyPaddleSignature(body, sign(body, SECRET, old), SECRET);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/window/);
    });

    it("rejects a malformed or missing header rather than throwing", () => {
      expect(verifyPaddleSignature(body, undefined, SECRET).valid).toBe(false);
      expect(verifyPaddleSignature(body, "nonsense", SECRET).valid).toBe(false);
      expect(verifyPaddleSignature(body, "ts=abc;h1=", SECRET).valid).toBe(false);
    });

    it("verifies against the exact bytes, not a re-serialised object", () => {
      // Formatting is the property that matters: JSON.parse/stringify happens
      // to preserve key order, but it does not preserve whitespace, and the
      // HMAC covers every byte. Anything that rebuilds the body from the
      // parsed object risks exactly this.
      const raw = '{\n  "event_type": "transaction.completed",\n  "event_id": "evt_1"\n}';
      const signature = sign(raw);
      expect(verifyPaddleSignature(raw, signature, SECRET).valid).toBe(true);

      const reserialised = JSON.stringify(JSON.parse(raw));
      expect(reserialised).not.toBe(raw);
      expect(verifyPaddleSignature(reserialised, signature, SECRET).valid).toBe(false);
    });
  });

  describe("webhook handling (live schema)", () => {
    let service: PaddleWebhookService;
    let repository: PaddleRepository;
    let pool: Pool;

    const ownerId = randomUUID();
    const orgId = randomUUID();
    const customerId = `ctm_${randomUUID().slice(0, 12)}`;
    const subscriptionId = `sub_${randomUUID().slice(0, 12)}`;
    const monthlyPriceId = `pri_${randomUUID().slice(0, 12)}`;
    // Event ids are the idempotency key, so they must be unique per run —
    // a hardcoded id surviving from an earlier run reads as a duplicate.
    const run = randomUUID().slice(0, 8);
    let planId: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          PaddleModule,
        ],
      }).compile();

      service = moduleRef.get(PaddleWebhookService);
      repository = moduleRef.get(PaddleRepository);
      pool = moduleRef.get<Pool>(PG_POOL);

      await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
        ownerId,
        `paddle-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,'Paddle Org',$2,$3)`,
        [orgId, `paddle-${orgId.slice(0, 8)}`, ownerId],
      );
      await pool.query(
        `insert into public.ai_credit_balances
           (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 100, 0, 100)`,
        [orgId],
      );

      const plan = await pool.query<{ id: string }>(
        `insert into public.subscription_plans
           (name, slug, monthly_price, yearly_price, currency, ai_credits,
            paddle_price_id_monthly, is_active)
         values ('Paddle Test Plan', $1, 19, 190, 'USD', 5000, $2, true)
         returning id`,
        [`paddle-test-${orgId.slice(0, 8)}`, monthlyPriceId],
      );
      planId = plan.rows[0]!.id;
    });

    afterAll(async () => {
      await pool.query(`delete from public.payment_webhook_events where event_id like $1`, [
        `%_${run}`,
      ]);
      await pool.query(`delete from public.invoices where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organization_subscriptions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.subscription_plans where id = $1`, [planId]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    const subscriptionEvent = (eventId: string, status = "active") => ({
      event_id: eventId,
      event_type: "subscription.created",
      data: {
        id: subscriptionId,
        customer_id: customerId,
        status,
        custom_data: { organization_id: orgId },
        current_billing_period: {
          starts_at: "2026-07-01T00:00:00Z",
          ends_at: "2026-08-01T00:00:00Z",
        },
        items: [{ price: { id: monthlyPriceId } }],
      },
    });

    const balance = async () => {
      const { rows } = await pool.query<{ available_credits: number }>(
        `select available_credits from public.ai_credit_balances where organization_id = $1`,
        [orgId],
      );
      return Number(rows[0]!.available_credits);
    };

    it("activates the subscription and grants the plan's credits", async () => {
      const before = await balance();
      const outcome = await service.handle(subscriptionEvent(`evt_sub_1_${run}`));

      expect(outcome).toMatchObject({ handled: true });
      expect(await balance()).toBe(before + 5000);

      const { rows } = await pool.query(
        `select plan_id, status, billing_cycle, provider_subscription_id
           from public.organization_subscriptions where organization_id = $1`,
        [orgId],
      );
      expect(rows[0]).toMatchObject({
        plan_id: planId,
        status: "active",
        billing_cycle: "monthly",
        provider_subscription_id: subscriptionId,
      });
    });

    it("ignores a retried event instead of granting the credits twice", async () => {
      const before = await balance();
      // Paddle retries until it gets a 2xx; the same event id arrives again.
      const outcome = await service.handle(subscriptionEvent(`evt_sub_1_${run}`));

      expect(outcome).toMatchObject({ handled: true, action: "duplicate ignored" });
      expect(await balance()).toBe(before);
    });

    it("refuses to upgrade anyone on a price it does not recognise", async () => {
      const before = await balance();
      const outcome = await service.handle({
        event_id: `evt_unknown_price_${run}`,
        event_type: "subscription.created",
        data: {
          id: `sub_${randomUUID().slice(0, 8)}`,
          customer_id: customerId,
          status: "active",
          custom_data: { organization_id: orgId },
          items: [{ price: { id: "pri_not_ours" } }],
        },
      });

      expect(outcome).toMatchObject({ handled: false });
      expect(await balance()).toBe(before);
    });

    it("does not grant credits for a subscription that is not active", async () => {
      const before = await balance();
      await service.handle(subscriptionEvent(`evt_sub_trial_${run}`, "trialing"));
      expect(await balance()).toBe(before);
    });

    it("records a completed payment as an invoice", async () => {
      await service.handle({
        event_id: `evt_txn_1_${run}`,
        event_type: "transaction.completed",
        data: {
          customer_id: customerId,
          custom_data: { organization_id: orgId },
          invoice_number: "INV-2026-001",
          billed_at: "2026-07-20T10:00:00Z",
          details: { totals: { grand_total: "1900", currency_code: "USD" } },
        },
      });

      const { rows } = await pool.query<{ amount: string; status: string }>(
        `select amount, status from public.invoices where organization_id = $1`,
        [orgId],
      );
      // Paddle reports the smallest currency unit: 1900 cents is $19.00.
      expect(Number(rows[0]!.amount)).toBe(19);
      expect(rows[0]!.status).toBe("paid");
    });

    it("marks a cancelled subscription without touching credits", async () => {
      const before = await balance();
      await service.handle({
        event_id: `evt_cancel_1_${run}`,
        event_type: "subscription.canceled",
        data: { id: subscriptionId },
      });

      const { rows } = await pool.query<{ status: string }>(
        `select status from public.organization_subscriptions where organization_id = $1`,
        [orgId],
      );
      expect(rows[0]!.status).toBe("canceled");
      // Cancelling does not claw back credits already paid for.
      expect(await balance()).toBe(before);
    });

    it("acknowledges event types it does not act on", async () => {
      const outcome = await service.handle({
        event_id: `evt_misc_1_${run}`,
        event_type: "customer.updated",
        data: { id: customerId },
      });
      expect(outcome).toMatchObject({ handled: true });
    });

    it("releases the claim when a handler throws, so the retry is not skipped", async () => {
      const eventId = `evt_boom_1_${run}`;
      jest
        .spyOn(repository, "applySubscription")
        .mockRejectedValueOnce(new Error("database exploded"));

      await expect(service.handle(subscriptionEvent(eventId))).rejects.toThrow(
        "database exploded",
      );

      const { rows } = await pool.query(
        `select 1 from public.payment_webhook_events where event_id = $1`,
        [eventId],
      );
      expect(rows).toHaveLength(0);
    });
  });
});
