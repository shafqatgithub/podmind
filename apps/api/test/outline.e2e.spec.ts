import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { OutlineModule } from "../src/outlines/outline.module";
import { OutlineService } from "../src/outlines/outline.service";
import { buildOutlineMessages } from "../src/outlines/outline.prompt";
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

const GOOD_OUTLINE = JSON.stringify({
  title: "Why Attention Is the Real Currency",
  description: "A 30 minute look at how attention became the product.",
  hook: "You checked your phone before you finished this sentence.",
  estimated_minutes: 30,
  sections: [
    {
      title: "Cold open",
      description: "Land the hook and promise the payoff.",
      estimated_minutes: 3,
      talking_points: ["Open with your own screen time", "Promise a framework"],
      transition: "So how did we get here?",
    },
    {
      title: "How attention became a product",
      description: "The business model shift.",
      estimated_minutes: 12,
      talking_points: ["Ad-funded media", "Engagement metrics"],
      transition: "Which raises an uncomfortable question.",
    },
    {
      title: "Outro",
      description: "Close and call to action.",
      estimated_minutes: 5,
      talking_points: ["Recap the framework", "Ask for a review"],
      transition: null,
    },
  ],
  call_to_action: "Ask listeners to check their screen time and report back.",
  closing: "Attention is the one thing you cannot make more of.",
  questions: ["What would a healthier model look like?"],
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
      text: this.mode === "prose" ? "Here is an outline in prose form." : GOOD_OUTLINE,
      promptTokens: 700,
      completionTokens: 1500,
      model: "gpt-5",
      provider: this.slug,
    });
  }
}

describe("Outline Builder", () => {
  describe("prompt", () => {
    it("carries style guidance, duration, context and research into the prompt", () => {
      const [system, user] = buildOutlineMessages({
        topic: "The attention economy",
        style: "interview",
        durationMinutes: 45,
        podcastName: "Deep Work Radio",
        audience: "Founders",
        guestName: "Dr Sarah Chen",
        researchSummary: "Attention is finite.",
        researchKeyPoints: ["Ad models optimise for time spent"],
        language: "en",
      });

      expect(system!.content).toMatch(/Never invent statistics/i);
      expect(user!.content).toContain("45 minutes");
      expect(user!.content).toContain("Dr Sarah Chen");
      expect(user!.content).toMatch(/host and a guest/i);
      // Research is passed through so the outline builds on real work.
      expect(user!.content).toContain("Attention is finite.");
      expect(user!.content).toContain("Ad models optimise for time spent");
    });

    it("requests the project's language", () => {
      const [, user] = buildOutlineMessages({
        topic: "Test",
        style: "solo",
        durationMinutes: 20,
        language: "ur",
      });
      expect(user!.content).toContain("Urdu");
    });
  });

  describe("generation (live schema)", () => {
    let service: OutlineService;
    let credits: CreditsService;
    let pool: Pool;
    let provider: ScriptedProvider;
    let tenant: TenantContext;

    const ownerId = randomUUID();
    const orgId = randomUUID();
    let workspaceId: string;
    let projectId: string;
    let researchSessionId: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          TenancyModule,
          OutlineModule,
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

      service = moduleRef.get(OutlineService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
        ownerId,
        `outline-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1,'Outline Org',$2,$3)`,
        [orgId, `ol-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `olws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title, podcast_name, audience)
         values ($1,$2,'Outline Project','Deep Work Radio','Founders') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;

      const session = await pool.query<{ id: string }>(
        `insert into public.research_sessions (project_id, created_by, title, topic, depth)
         values ($1,$2,'Attention','attention','standard'::research_depth) returning id`,
        [projectId, ownerId],
      );
      researchSessionId = session.rows[0]!.id;
      await pool.query(
        `insert into public.research_results (session_id, ai_agent, title, summary, content, metadata)
         values ($1,'research'::ai_agent,'Attention','Attention is finite.','x',$2)`,
        [researchSessionId, JSON.stringify({ key_points: ["Ad models optimise for time"] })],
      );

      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 200, 0, 200)`,
        [orgId],
      );

      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.outlines where project_id in (
           select id from public.projects where workspace_id = $1)`,
        [workspaceId],
      );
      await pool.query(
        `delete from public.research_sessions where project_id in (
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

    it("generates and stores an outline with sections and talking points", async () => {
      const before = await credits.getBalance(orgId);

      const created = await service.create(tenant, {
        project_id: projectId,
        topic: "The attention economy",
        style: "solo",
        duration_minutes: 30,
      });

      expect(await credits.getBalance(orgId)).toBeLessThan(before);

      const outline = await service.findOne(tenant, created.id);
      expect(outline.title).toBe("Why Attention Is the Real Currency");
      expect(outline.sections).toHaveLength(3);
      expect(outline.sections[0]!.title).toBe("Cold open");
      // Sections keep the order the model gave them.
      expect(outline.sections.map((s) => s.sort_order)).toEqual([0, 1, 2]);
      // Duration is the sum of the sections, not the request.
      expect(outline.estimated_duration_minutes).toBe(20);

      const meta = outline.metadata as Record<string, unknown>;
      expect(meta.hook).toMatch(/checked your phone/);
      expect(meta.call_to_action).toMatch(/screen time/);

      expect(outline.questions[0]!.question).toMatch(/healthier model/);

      // Talking points are also rows, so they can be edited individually.
      const { rows } = await pool.query<{ count: number }>(
        `select count(*)::int as count from public.outline_talking_points p
          join public.outline_sections s on s.id = p.section_id
         where s.outline_id = $1`,
        [created.id],
      );
      expect(rows[0]!.count).toBe(6);
    });

    it("builds on an existing research session when given one", async () => {
      await service.create(tenant, {
        project_id: projectId,
        topic: "Follow-up episode",
        research_session_id: researchSessionId,
      });

      const prompt = provider.lastOptions?.messages[1]?.content ?? "";
      expect(prompt).toContain("Attention is finite.");
      expect(prompt).toContain("Ad models optimise for time");
    });

    it("versions outlines and keeps exactly one current per project", async () => {
      await service.create(tenant, { project_id: projectId, topic: "First" });
      await service.create(tenant, { project_id: projectId, topic: "Second" });

      const { rows } = await pool.query<{ current: number; max_version: number }>(
        `select count(*) filter (where is_current)::int as current,
                max(version)::int as max_version
           from public.outlines where project_id = $1`,
        [projectId],
      );
      expect(rows[0]!.current).toBe(1);
      expect(rows[0]!.max_version).toBeGreaterThan(1);
    });

    it("keeps the work when the model returns prose", async () => {
      provider.mode = "prose";
      const created = await service.create(tenant, {
        project_id: projectId,
        topic: "Prose fallback",
      });

      const outline = await service.findOne(tenant, created.id);
      expect((outline.metadata as Record<string, unknown>).unstructured).toBe(true);
      expect(outline.sections[0]!.description).toContain("prose form");
    });

    it("refunds credits when generation fails", async () => {
      provider.mode = "fail";
      const before = await credits.getBalance(orgId);

      await expect(
        service.create(tenant, { project_id: projectId, topic: "Doomed" }),
      ).rejects.toMatchObject({ status: 503 });

      expect(await credits.getBalance(orgId)).toBe(before);
    });

    it("rejects a project from another tenant", async () => {
      await expect(
        service.create(tenant, { project_id: randomUUID(), topic: "Nope" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("lists and deletes outlines within the tenant", async () => {
      const created = await service.create(tenant, {
        project_id: projectId,
        topic: "Deletable",
      });

      const list = await service.list(tenant, projectId);
      expect(list.items.some((o) => o.id === created.id)).toBe(true);

      await service.remove(tenant, created.id);
      await expect(service.findOne(tenant, created.id)).rejects.toMatchObject({ status: 404 });
    });
  });
});
