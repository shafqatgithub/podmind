import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { AiModule } from "../src/ai/ai.module";
import { AiRouterService, TASK_CREDIT_COST } from "../src/ai/routing/ai-router.service";
import { CreditsService, InsufficientCreditsException } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import {
  buildRoutePlan,
  LONG_CONTEXT_CHAR_THRESHOLD,
  TASK_ROUTES,
} from "../src/ai/routing/model-selection";
import {
  type AiProvider,
  type CompletionOptions,
  type CompletionResult,
  ProviderError,
  type ProviderSlug,
} from "../src/ai/providers/provider.types";

/** Scriptable fake provider — no network, real Router code path. */
class FakeProvider implements AiProvider {
  calls = 0;
  constructor(
    readonly slug: ProviderSlug,
    private behaviour: "ok" | "retryable" | "terminal" | "unconfigured",
  ) {}

  isConfigured(): boolean {
    return this.behaviour !== "unconfigured";
  }

  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.calls += 1;
    if (this.behaviour === "retryable") {
      return Promise.reject(new ProviderError(this.slug, "upstream 503", true, 503));
    }
    if (this.behaviour === "terminal") {
      return Promise.reject(new ProviderError(this.slug, "bad request", false, 400));
    }
    return Promise.resolve({
      text: '{"ok": true}',
      promptTokens: 100,
      completionTokens: 50,
      model: options.model,
      provider: this.slug,
    });
  }

  set(behaviour: "ok" | "retryable" | "terminal" | "unconfigured") {
    this.behaviour = behaviour;
  }
}

describe("AI Router", () => {
  /* --------------------------------------------------- pure routing rules */
  describe("model selection (documented rules)", () => {
    it("routes research to Claude Opus first, then GPT-5, then Gemini Pro", () => {
      const plan = buildRoutePlan("research", 500);
      expect(plan.map((c) => `${c.provider}:${c.family}`)).toEqual([
        "anthropic:claude-opus",
        "openai:gpt-5",
        "google:gemini-pro",
      ]);
    });

    it("routes script writing to GPT-5 first", () => {
      expect(buildRoutePlan("script", 500)[0]).toEqual({
        provider: "openai",
        family: "gpt-5",
      });
    });

    it("routes SEO and chat to the mini/flash tier", () => {
      expect(buildRoutePlan("seo", 100)[0]?.family).toBe("gpt-5-mini");
      expect(buildRoutePlan("chat", 100)[0]?.family).toBe("gpt-5-mini");
    });

    it("switches to the long-context chain for very large prompts", () => {
      const plan = buildRoutePlan("script", LONG_CONTEXT_CHAR_THRESHOLD + 1);
      expect(plan[0]).toEqual({ provider: "google", family: "gemini-pro" });
    });

    it("hoists an organization's preferred provider without losing fallbacks", () => {
      const plan = buildRoutePlan("research", 500, "google");
      expect(plan[0]?.provider).toBe("google");
      expect(plan).toHaveLength(TASK_ROUTES.research.length);
      expect(plan.map((c) => c.provider)).toEqual(
        expect.arrayContaining(["anthropic", "openai", "google"]),
      );
    });

    it("covers every task in the ai_task enum", () => {
      const tasks = Object.keys(TASK_ROUTES);
      expect(tasks).toHaveLength(10);
      tasks.forEach((t) => {
        expect(TASK_CREDIT_COST[t as keyof typeof TASK_CREDIT_COST]).toBeGreaterThan(0);
      });
    });
  });

  /* ------------------------------------------ integration with a real DB */
  describe("routing, credits and telemetry (live schema)", () => {
    let moduleRef: Awaited<ReturnType<ReturnType<typeof Test.createTestingModule>["compile"]>>;
    let router: AiRouterService;
    let credits: CreditsService;
    let pool: Pool;
    let anthropic: FakeProvider;
    let openai: FakeProvider;
    let google: FakeProvider;
    const orgId = randomUUID();
    const ownerId = randomUUID();

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          AiModule,
        ],
      })
        .overrideProvider(ProviderRegistry)
        .useFactory({
          factory: () => {
            anthropic = new FakeProvider("anthropic", "ok");
            openai = new FakeProvider("openai", "ok");
            google = new FakeProvider("google", "ok");
            const map = new Map<ProviderSlug, AiProvider>([
              ["anthropic", anthropic],
              ["openai", openai],
              ["google", google],
            ]);
            return {
              get: (slug: ProviderSlug) => map.get(slug),
              configured: () => [...map.values()].filter((p) => p.isConfigured()).map((p) => p.slug),
              all: () => [...map.values()],
            } as ProviderRegistry;
          },
        })
        .compile();

      router = moduleRef.get(AiRouterService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      // Owner first: organizations.owner_id is NOT NULL. The auth.users
      // insert fires the live signup trigger which provisions the profile.
      await pool.query(
        `insert into auth.users (id, email) values ($1, $2)`,
        [ownerId, `router-${ownerId.slice(0, 8)}@podmind.test`],
      );
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, 'E2E Org', $2, $3)`,
        [orgId, `e2e-${orgId.slice(0, 8)}`, ownerId],
      );
      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 100, 0, 100)`,
        [orgId],
      );
    });

    afterAll(async () => {
      await pool.query(`delete from public.ai_requests where metadata->>'organization_id' = $1`, [
        orgId,
      ]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    beforeEach(() => {
      anthropic.set("ok");
      openai.set("ok");
      google.set("ok");
      anthropic.calls = 0;
      openai.calls = 0;
      google.calls = 0;
    });

    it("resolves documented model families to real provider API identifiers", async () => {
      const catalog = moduleRef.get(ModelCatalog);
      const opus = await catalog.resolve("anthropic", "claude-opus");
      const sonnet = await catalog.resolve("anthropic", "claude-sonnet");

      // ai_models.model_name is sent verbatim as the provider's `model`
      // field. Anthropic rejects shorthand names, so the catalog must hold
      // versioned identifiers while the routing rules keep using families.
      expect(opus?.modelName).toMatch(/^claude-opus-\d/);
      expect(sonnet?.modelName).toMatch(/^claude-sonnet-\d/);

      // OpenAI and Google identifiers are already API-valid.
      expect((await catalog.resolve("openai", "gpt-5"))?.modelName).toBe("gpt-5");
      expect((await catalog.resolve("google", "gemini-pro"))?.modelName).toMatch(/^gemini-/);
    });

    it("routes a research task to the preferred provider and charges credits", async () => {
      const before = await credits.getBalance(orgId);
      const result = await router.route({
        organizationId: orgId,
        task: "research",
        messages: [{ role: "user", content: "Research polyphasic sleep" }],
      });

      expect(result.provider).toBe("anthropic");
      expect(result.creditsSpent).toBe(TASK_CREDIT_COST.research);
      expect(result.fallbacksUsed).toEqual([]);
      expect(result.requestId).toBeTruthy();
      expect(await credits.getBalance(orgId)).toBe(before - TASK_CREDIT_COST.research);
    });

    it("writes telemetry to ai_requests with tokens, cost and latency", async () => {
      const result = await router.route({
        organizationId: orgId,
        task: "chat",
        messages: [{ role: "user", content: "hello" }],
      });

      const { rows } = await pool.query<{
        task: string;
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        success: boolean;
        latency_ms: number;
      }>(`select task, prompt_tokens, completion_tokens, total_tokens, success, latency_ms
            from public.ai_requests where id = $1`, [result.requestId]);

      expect(rows[0]).toMatchObject({
        task: "chat",
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        success: true,
      });
      expect(rows[0]!.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it("falls back to the next provider when the preferred one fails", async () => {
      anthropic.set("terminal");
      const result = await router.route({
        organizationId: orgId,
        task: "research",
        messages: [{ role: "user", content: "topic" }],
      });

      expect(result.provider).toBe("openai");
      expect(result.fallbacksUsed).toEqual(["anthropic"]);
      expect(anthropic.calls).toBe(1); // terminal error: no retry
    });

    it("retries a retryable failure before falling back", async () => {
      anthropic.set("retryable");
      const result = await router.route({
        organizationId: orgId,
        task: "research",
        messages: [{ role: "user", content: "topic" }],
      });

      expect(anthropic.calls).toBe(2); // one retry
      expect(result.provider).toBe("openai");
    });

    it("skips unconfigured providers entirely", async () => {
      anthropic.set("unconfigured");
      const result = await router.route({
        organizationId: orgId,
        task: "research",
        messages: [{ role: "user", content: "topic" }],
      });

      expect(anthropic.calls).toBe(0);
      expect(result.provider).toBe("openai");
    });

    it("refunds credits when every provider in the chain fails", async () => {
      anthropic.set("terminal");
      openai.set("terminal");
      google.set("terminal");
      const before = await credits.getBalance(orgId);

      await expect(
        router.route({
          organizationId: orgId,
          task: "research",
          messages: [{ role: "user", content: "topic" }],
        }),
      ).rejects.toMatchObject({ status: 503 });

      expect(await credits.getBalance(orgId)).toBe(before);
      const { rows } = await pool.query<{ count: string }>(
        `select count(*) from public.ai_credit_transactions
          where organization_id = $1 and transaction_type = 'refund'`,
        [orgId],
      );
      expect(Number(rows[0]!.count)).toBeGreaterThan(0);
    });

    it("rejects with 402 when credits are exhausted", async () => {
      await pool.query(
        `update public.ai_credit_balances set available_credits = 0 where organization_id = $1`,
        [orgId],
      );

      await expect(
        router.route({
          organizationId: orgId,
          task: "research",
          messages: [{ role: "user", content: "topic" }],
        }),
      ).rejects.toBeInstanceOf(InsufficientCreditsException);

      await pool.query(
        `update public.ai_credit_balances set available_credits = 100 where organization_id = $1`,
        [orgId],
      );
    });

    it("does not double-spend under concurrent requests", async () => {
      await pool.query(
        `update public.ai_credit_balances set available_credits = 3 where organization_id = $1`,
        [orgId],
      );

      // chat costs 1 credit; 10 parallel requests against a balance of 3.
      const results = await Promise.allSettled(
        Array.from({ length: 10 }, () =>
          router.route({
            organizationId: orgId,
            task: "chat",
            messages: [{ role: "user", content: "hi" }],
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      expect(fulfilled).toBe(3);
      expect(await credits.getBalance(orgId)).toBe(0);
    });
  });
});
