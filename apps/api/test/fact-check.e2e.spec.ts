import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { FactCheckModule } from "../src/fact-checks/fact-check.module";
import { FactCheckService } from "../src/fact-checks/fact-check.service";
import { buildFactCheckMessages } from "../src/fact-checks/fact-check.prompt";
import { CreditsService } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import type { TenantContext } from "../src/tenancy/tenancy.service";
import {
  ProviderError,
  type AiProvider,
  type CompletionOptions,
  type CompletionResult,
  type ProviderSlug,
} from "../src/ai/providers/provider.types";

const RESPONSE = JSON.stringify({
  summary: "Mostly sound, with one figure that needs checking.",
  claims: [
    {
      claim: "The first podcast was published in 2004.",
      claim_type: "date",
      verdict: "verified",
      confidence: 0.9,
      explanation: "Widely documented.",
      evidence: ["Contemporary press coverage"],
    },
    {
      claim: "58% of adults check their phone within ten minutes of waking.",
      claim_type: "statistic",
      verdict: "partially_verified",
      confidence: 0.5,
      explanation: "Surveys report a range; the exact figure varies by year.",
      correction: "Figures commonly reported fall between 45% and 70%.",
      evidence: [],
    },
    {
      claim: "Our competitor raised $400m last quarter.",
      claim_type: "company",
      // Deliberately not a documented verdict.
      verdict: "probably true",
      confidence: 0.4,
      explanation: "Recent and specific; cannot confirm.",
      evidence: [],
    },
    { claim: "", verdict: "verified" },
  ],
});

class ScriptedProvider implements AiProvider {
  mode: "ok" | "prose" | "fail" = "ok";
  lastOptions: CompletionOptions | null = null;

  constructor(readonly slug: ProviderSlug) {}
  isConfigured() {
    return true;
  }
  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.lastOptions = options;
    if (this.mode === "fail") {
      return Promise.reject(new ProviderError(this.slug, "down", false, 400));
    }
    return Promise.resolve({
      text: this.mode === "prose" ? "Looks fine to me." : RESPONSE,
      promptTokens: 800,
      completionTokens: 900,
      model: "gpt-5",
      provider: this.slug,
    });
  }
}

describe("Fact Checker", () => {
  describe("prompt", () => {
    it("states the model's own limits and forbids invented sources", () => {
      const [system, user] = buildFactCheckMessages({
        text: "Some claim about the world.",
        language: "en",
        context: "A podcast script.",
      });

      expect(system!.content).toMatch(/no live internet access/i);
      expect(system!.content).toMatch(/Never invent a source/i);
      // Time-sensitive facts must not be waved through.
      expect(system!.content).toMatch(/time-sensitive/i);
      expect(user!.content).toContain("Some claim about the world.");
      expect(user!.content).toContain("A podcast script.");
    });
  });

  describe("checking (live schema)", () => {
    let service: FactCheckService;
    let credits: CreditsService;
    let pool: Pool;
    let provider: ScriptedProvider;
    let tenant: TenantContext;

    const ownerId = randomUUID();
    const orgId = randomUUID();
    let workspaceId: string;
    let projectId: string;
    let scriptId: string;

    const LONG_TEXT =
      "The first podcast was published in 2004. Around 58% of adults check their phone within ten minutes of waking, according to several surveys.";

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          TenancyModule,
          FactCheckModule,
        ],
      })
        .overrideProvider(ProviderRegistry)
        .useFactory({
          factory: () => {
            provider = new ScriptedProvider("openai");
            const map = new Map<ProviderSlug, AiProvider>([["openai", provider]]);
            return {
              get: (slug: ProviderSlug) => map.get(slug),
              configured: () => ["openai" as ProviderSlug],
              all: () => [...map.values()],
            } as ProviderRegistry;
          },
        })
        .compile();

      service = moduleRef.get(FactCheckService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
        ownerId,
        `fact-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1,'Fact Org',$2,$3)`,
        [orgId, `fc-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `fcws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title)
         values ($1,$2,'Fact Project') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;

      const script = await pool.query<{ id: string }>(
        `insert into public.scripts
           (project_id, created_by, title, script_style, content, version, is_current)
         values ($1,$2,'Episode one','solo'::script_style,$3,1,true) returning id`,
        [projectId, ownerId, LONG_TEXT],
      );
      scriptId = script.rows[0]!.id;

      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 200, 0, 200)`,
        [orgId],
      );

      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.fact_checks where project_id in (
           select id from public.projects where workspace_id = $1)`,
        [workspaceId],
      );
      await pool.query(
        `delete from public.scripts where project_id in (
           select id from public.projects where workspace_id = $1)`,
        [workspaceId],
      );
      await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
      await pool.query(`delete from public.ai_requests where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    beforeEach(() => {
      provider.mode = "ok";
    });

    it("checks a script and stores every claim with its verdict", async () => {
      const before = await credits.getBalance(orgId);

      const created = await service.create(tenant, {
        project_id: projectId,
        script_id: scriptId,
      });

      expect(await credits.getBalance(orgId)).toBeLessThan(before);
      expect(created.script_id).toBe(scriptId);

      const check = await service.findOne(tenant, created.id);
      // The empty-claim entry is dropped; three real claims remain.
      expect(check.claims).toHaveLength(3);
      expect(check.total_claims).toBe(3);
      expect(check.verified_claims).toBe(1);

      const [first, second, third] = check.claims;
      expect(first!.verdict).toBe("verified");
      expect(first!.claim_type).toBe("date");
      expect(second!.verdict).toBe("partially_verified");
      expect(second!.correction).toMatch(/45% and 70%/);
      // An unrecognised verdict fails safe to unverified, never to verified.
      expect(third!.verdict).toBe("unverified");
    });

    it("counts anything a host should look at before publishing", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        script_id: scriptId,
      });
      const check = await service.findOne(tenant, created.id);
      // partially_verified is not flagged; unverified is.
      expect(check.flagged_claims).toBe(1);
    });

    it("always records that the check has no live sources", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        script_id: scriptId,
      });
      const check = await service.findOne(tenant, created.id);
      expect((check.metadata as Record<string, unknown>).disclaimer).toMatch(
        /no live sources/i,
      );
    });

    it("checks pasted text", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        text: LONG_TEXT,
        title: "Ad copy check",
      });
      expect(created.title).toBe("Ad copy check");
      expect(provider.lastOptions?.messages[1]?.content).toContain("first podcast");
    });

    it("rejects zero sources and more than one", async () => {
      await expect(
        service.create(tenant, { project_id: projectId }),
      ).rejects.toMatchObject({ status: 400 });

      await expect(
        service.create(tenant, {
          project_id: projectId,
          script_id: scriptId,
          text: LONG_TEXT,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("rejects text too short to check", async () => {
      await expect(
        service.create(tenant, { project_id: projectId, text: "Too short." }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it("records a check with no claims rather than failing", async () => {
      provider.mode = "prose";
      const created = await service.create(tenant, {
        project_id: projectId,
        script_id: scriptId,
      });
      const check = await service.findOne(tenant, created.id);

      expect(check.claims).toHaveLength(0);
      expect(check.total_claims).toBe(0);
      expect((check.metadata as Record<string, unknown>).unstructured).toBe(true);
    });

    it("refunds credits when the check fails", async () => {
      provider.mode = "fail";
      const before = await credits.getBalance(orgId);

      await expect(
        service.create(tenant, { project_id: projectId, script_id: scriptId }),
      ).rejects.toMatchObject({ status: 503 });

      expect(await credits.getBalance(orgId)).toBe(before);
    });

    it("rejects a project and a script from another tenant", async () => {
      await expect(
        service.create(tenant, { project_id: randomUUID(), text: LONG_TEXT }),
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        service.create(tenant, { project_id: projectId, script_id: randomUUID() }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("lists and soft-deletes checks", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        script_id: scriptId,
      });

      const list = await service.list(tenant, projectId);
      expect(list.items.some((c) => c.id === created.id)).toBe(true);

      await service.remove(tenant, created.id);
      await expect(service.findOne(tenant, created.id)).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
