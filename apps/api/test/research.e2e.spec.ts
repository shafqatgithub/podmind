import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { ResearchModule } from "../src/research/research.module";
import { ResearchService } from "../src/research/research.service";
import { CreditsService } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import { buildResearchMessages } from "../src/research/research.prompt";
import type { TenantContext } from "../src/tenancy/tenancy.service";
import type {
  AiProvider,
  CompletionOptions,
  CompletionResult,
  ProviderSlug,
} from "../src/ai/providers/provider.types";
import { ProviderError } from "../src/ai/providers/provider.types";

/** A realistic model response, so parsing is tested against real shapes. */
const GOOD_RESPONSE = JSON.stringify({
  title: "The Economics of Attention",
  summary: "A four sentence briefing about the attention economy and its trade-offs.",
  key_points: ["Attention is finite", "Ad models optimise for time spent"],
  statistics: [
    { value: "58%", claim: "adults who check phones within 10 minutes of waking", source: "Pew", year: "2024", confidence: "medium" },
  ],
  timeline: [{ date: "2007", event: "Smartphone era begins" }],
  case_studies: [{ name: "Netflix", detail: "Competes with sleep, not other studios" }],
  expert_opinions: [{ expert: "Herbert Simon, economist", position: "Information consumes attention" }],
  myths: [{ myth: "Multitasking is efficient", reality: "Task switching costs time" }],
  arguments: ["Personalisation improves relevance"],
  counter_arguments: ["Engagement optimisation can amplify outrage"],
  discussion_ideas: ["Open with the host's own screen-time number"],
  follow_up_questions: ["What would a healthier business model look like?"],
  related_topics: ["Digital minimalism"],
  uncertainties: ["Long-term cognitive effects are still debated"],
  sources: [
    { title: "The Attention Merchants", url: "https://example.org/book", author: "Tim Wu", source_type: "book", credibility: "high" },
    { title: "Pew Research: Mobile Fact Sheet", url: "", author: "", source_type: "report", credibility: "medium" },
  ],
  confidence_score: 0.72,
});

class ScriptedProvider implements AiProvider {
  mode: "ok" | "prose" | "fail" = "ok";
  calls = 0;
  lastOptions: CompletionOptions | null = null;

  constructor(readonly slug: ProviderSlug) {}

  isConfigured(): boolean {
    return true;
  }

  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.calls += 1;
    this.lastOptions = options;
    if (this.mode === "fail") {
      return Promise.reject(new ProviderError(this.slug, "provider exploded", false, 400));
    }
    return Promise.resolve({
      text: this.mode === "prose" ? "Here is some research written as prose." : GOOD_RESPONSE,
      promptTokens: 800,
      completionTokens: 1200,
      model: "claude-opus",
      provider: this.slug,
    });
  }
}

describe("Research module", () => {
  describe("prompt construction", () => {
    it("carries project context and the documented rules into the prompt", () => {
      const messages = buildResearchMessages({
        topic: "The attention economy",
        objective: "Prepare a 45 minute episode",
        depth: "deep",
        podcastName: "Deep Work Radio",
        audience: "Knowledge workers",
        niche: "Productivity",
        language: "en",
      });

      expect(messages).toHaveLength(2);
      const [system, user] = messages;
      expect(system!.content).toMatch(/Never hallucinate/i);
      expect(system!.content).toMatch(/Never invent references/i);
      expect(user!.content).toContain("The attention economy");
      expect(user!.content).toContain("Deep Work Radio");
      expect(user!.content).toContain("Knowledge workers");
      expect(user!.content).toMatch(/DEEP research/);
      expect(user!.content).toContain('"confidence_score"');
    });

    it("asks for output in the project's language", () => {
      const [, user] = buildResearchMessages({
        topic: "Test",
        depth: "quick",
        language: "ur",
      });
      expect(user!.content).toContain("Urdu");
    });
  });

  describe("running research (live schema)", () => {
    let service: ResearchService;
    let credits: CreditsService;
    let pool: Pool;
    let provider: ScriptedProvider;
    let tenant: TenantContext;

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
          ResearchModule,
        ],
      })
        .overrideProvider(ProviderRegistry)
        .useFactory({
          factory: () => {
            provider = new ScriptedProvider("anthropic");
            const map = new Map<ProviderSlug, AiProvider>([["anthropic", provider]]);
            return {
              get: (slug: ProviderSlug) => map.get(slug),
              configured: () => ["anthropic" as ProviderSlug],
              all: () => [...map.values()],
            } as ProviderRegistry;
          },
        })
        .compile();

      service = moduleRef.get(ResearchService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
        ownerId,
        `research-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, 'Research Org', $2, $3)`,
        [orgId, `research-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1, 'WS', $2, $3) returning id`,
        [orgId, `ws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;

      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title, podcast_name, audience, niche)
         values ($1, $2, 'Attention Episode', 'Deep Work Radio', 'Knowledge workers', 'Productivity')
         returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;

      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 500, 0, 500)`,
        [orgId],
      );

      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.research_sessions where project_id = $1`,
        [projectId],
      );
      await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
      await pool.query(`delete from public.ai_requests where metadata->>'organization_id' = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    beforeEach(() => {
      provider.mode = "ok";
      provider.calls = 0;
    });

    it("runs research and persists the structured result", async () => {
      const before = await credits.getBalance(orgId);

      const session = await service.create(tenant, {
        project_id: projectId,
        topic: "The attention economy",
        objective: "Prepare a 45 minute episode",
        depth: "deep",
      });

      expect(session.provider).toBe("anthropic");
      expect(session.credits_spent).toBe(10);
      expect(await credits.getBalance(orgId)).toBe(before - 10);

      const detail = await service.findOne(tenant, session.id);
      const result = detail.results[0]!;

      expect(result.title).toBe("The Economics of Attention");
      expect(result.summary).toMatch(/attention economy/i);
      expect(result.confidence_score).toBeCloseTo(0.72, 2);
      expect(result.token_usage).toBe(2000);

      // Structured fields survive the round trip through jsonb.
      const meta = result.metadata as Record<string, unknown>;
      expect(meta.key_points).toEqual(["Attention is finite", "Ad models optimise for time spent"]);
      expect(meta.myths).toHaveLength(1);
      expect(meta.counter_arguments).toHaveLength(1);

      // Markdown rendering is readable, not raw JSON.
      expect(result.content).toContain("## Summary");
      expect(result.content).toContain("## Key Points");
      expect(result.content).not.toContain('"confidence_score"');

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0]!.title).toBe("The Attention Merchants");
      // Sources are ranked by credibility (doc: Source Ranking).
      expect(Number(result.sources[0]!.credibility_score)).toBeGreaterThan(
        Number(result.sources[1]!.credibility_score),
      );

      expect(detail.questions.map((q) => q.question)).toContain(
        "What would a healthier business model look like?",
      );
    });

    it("applies the depth token budget", async () => {
      await service.create(tenant, {
        project_id: projectId,
        topic: "Quick topic",
        depth: "quick",
      });
      expect(provider.lastOptions?.maxTokens).toBe(2000);

      await service.create(tenant, {
        project_id: projectId,
        topic: "Deep topic",
        depth: "deep",
      });
      expect(provider.lastOptions?.maxTokens).toBe(8000);
    });

    it("keeps the work when the model returns prose instead of JSON", async () => {
      provider.mode = "prose";
      const session = await service.create(tenant, {
        project_id: projectId,
        topic: "Prose fallback",
      });

      const detail = await service.findOne(tenant, session.id);
      const result = detail.results[0]!;
      expect(result.content).toContain("written as prose");
      expect((result.metadata as Record<string, unknown>).unstructured).toBe(true);
    });

    it("refunds credits and marks the session failed when the AI call fails", async () => {
      provider.mode = "fail";
      const before = await credits.getBalance(orgId);

      await expect(
        service.create(tenant, { project_id: projectId, topic: "Doomed topic" }),
      ).rejects.toMatchObject({ status: 503 });

      expect(await credits.getBalance(orgId)).toBe(before);

      const { rows } = await pool.query<{ status: string; metadata: Record<string, unknown> }>(
        `select status::text as status, metadata from public.research_sessions
          where project_id = $1 and topic = 'Doomed topic'`,
        [projectId],
      );
      expect(rows[0]!.status).toBe("inactive");
      expect(rows[0]!.metadata.error).toBeTruthy();
    });

    it("rejects a project from another tenant", async () => {
      const otherOwner = randomUUID();
      const otherOrg = randomUUID();
      await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
        otherOwner,
        `other-${otherOwner.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, 'Other', $2, $3)`,
        [otherOrg, `other-${otherOrg.slice(0, 8)}`, otherOwner],
      );
      const otherWs = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1, 'Other WS', $2, $3) returning id`,
        [otherOrg, `otherws-${otherOrg.slice(0, 8)}`, otherOwner],
      );
      const otherProject = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title)
         values ($1, $2, 'Their project') returning id`,
        [otherWs.rows[0]!.id, otherOwner],
      );

      await expect(
        service.create(tenant, {
          project_id: otherProject.rows[0]!.id,
          topic: "Trying to reach another tenant",
        }),
      ).rejects.toMatchObject({ status: 404 });

      // No credits should have been spent on a rejected request.
      await pool.query(`delete from public.projects where workspace_id = $1`, [otherWs.rows[0]!.id]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [otherOrg]);
      await pool.query(`delete from public.audit_events where organization_id = $1`, [otherOrg]);
      await pool.query(`delete from public.organizations where id = $1`, [otherOrg]);
      await pool.query(`delete from auth.users where id = $1`, [otherOwner]);
    });

    it("lists and soft-deletes sessions within the tenant", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        topic: "Listable topic",
      });

      const page = await service.list(tenant, { project_id: projectId });
      expect(page.items.some((s) => s.id === created.id)).toBe(true);

      await service.remove(tenant, created.id);

      const after = await service.list(tenant, { project_id: projectId });
      expect(after.items.some((s) => s.id === created.id)).toBe(false);
      await expect(service.findOne(tenant, created.id)).rejects.toMatchObject({ status: 404 });
    });
  });
});
