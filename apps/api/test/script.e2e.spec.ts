import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { ScriptModule } from "../src/scripts/script.module";
import { ScriptService } from "../src/scripts/script.service";
import {
  buildScriptMessages,
  countWords,
  readabilityScore,
} from "../src/scripts/script.prompt";
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

/** ~140 words so duration maths lands on a predictable minute. */
const LONG_CONTENT = "This is a spoken sentence for the listener. ".repeat(20);

const GOOD_SCRIPT = JSON.stringify({
  title: "Why Attention Is the Real Currency",
  summary: "A conversational look at the attention economy.",
  sections: [
    {
      title: "Cold open",
      speaker: "host",
      content: LONG_CONTENT,
      notes: "Pause after the hook.",
      duration_seconds: 999,
    },
    {
      title: "Guest answers",
      speaker: "guest",
      content: "Listen for how they describe the trade-off.",
      notes: null,
      duration_seconds: 120,
    },
  ],
  editing_notes: ["Trim the pause at 2:15"],
  verify: ["Confirm the 58% figure before recording"],
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
      text: this.mode === "prose" ? "A script written as plain prose." : GOOD_SCRIPT,
      promptTokens: 900,
      completionTokens: 3000,
      model: "gpt-5",
      provider: this.slug,
    });
  }
}

describe("Script Builder", () => {
  describe("prompt and text maths", () => {
    it("writes the outline's running order into the prompt", () => {
      const [system, user] = buildScriptMessages({
        topic: "Attention",
        style: "interview",
        tone: "friendly",
        durationMinutes: 30,
        guestName: "Dr Chen",
        outline: {
          title: "Attention outline",
          hook: "You checked your phone already.",
          callToAction: "Check your screen time.",
          closing: "Attention is finite.",
          sections: [
            {
              title: "Cold open",
              description: "Land the hook",
              estimatedMinutes: 3,
              talkingPoints: ["Own screen time", "Promise a framework"],
            },
          ],
        },
      });

      expect(system!.content).toMatch(/never write dialogue for a guest/i);
      expect(system!.content).toMatch(/Never invent statistics/i);
      expect(user!.content).toContain("Cold open");
      expect(user!.content).toContain("Own screen time");
      expect(user!.content).toContain("You checked your phone already.");
      expect(user!.content).toContain("Dr Chen");
      // Target length is expressed in words the model can aim at.
      expect(user!.content).toMatch(/4200 spoken words/);
    });

    it("counts words and scores readability", () => {
      expect(countWords("  one two   three ")).toBe(3);
      // Too short to score meaningfully.
      expect(readabilityScore("Short.")).toBeNull();

      const simple = readabilityScore(
        "This is a short line. It is easy to read. The words are small. " +
          "You can say it out loud without effort at all today.",
      );
      const dense = readabilityScore(
        "Notwithstanding the aforementioned considerations, the epistemological " +
          "ramifications of intersubjective phenomenological interpretation remain " +
          "fundamentally irreducible to quantitative methodological frameworks, " +
          "particularly where institutional epistemologies presuppose incommensurable " +
          "ontological commitments across disciplinary boundaries.",
      );
      expect(simple).not.toBeNull();
      expect(dense).not.toBeNull();
      expect(simple!).toBeGreaterThan(dense!);
    });
  });

  describe("generation (live schema)", () => {
    let service: ScriptService;
    let credits: CreditsService;
    let pool: Pool;
    let provider: ScriptedProvider;
    let tenant: TenantContext;

    const ownerId = randomUUID();
    const orgId = randomUUID();
    let workspaceId: string;
    let projectId: string;
    let outlineId: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          TenancyModule,
          ScriptModule,
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

      service = moduleRef.get(ScriptService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
        ownerId,
        `script-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1,'Script Org',$2,$3)`,
        [orgId, `sc-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `scws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title, podcast_name, audience)
         values ($1,$2,'Script Project','Deep Work Radio','Founders') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;

      const outline = await pool.query<{ id: string }>(
        `insert into public.outlines
           (project_id, created_by, title, outline_type, version, is_current, metadata)
         values ($1,$2,'Attention outline','interview'::script_style,1,true,$3)
         returning id`,
        [projectId, ownerId, JSON.stringify({ hook: "You checked your phone already." })],
      );
      outlineId = outline.rows[0]!.id;
      await pool.query(
        `insert into public.outline_sections
           (outline_id, title, description, sort_order, estimated_minutes, talking_points)
         values ($1,'Cold open','Land the hook',0,3,$2)`,
        [outlineId, JSON.stringify(["Own screen time"])],
      );

      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 300, 0, 300)`,
        [orgId],
      );

      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.scripts where project_id in (
           select id from public.projects where workspace_id = $1)`,
        [workspaceId],
      );
      await pool.query(
        `delete from public.outlines where project_id in (
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

    it("writes from an outline, inheriting its style and running order", async () => {
      const before = await credits.getBalance(orgId);

      const script = await service.create(tenant, {
        project_id: projectId,
        outline_id: outlineId,
      });

      expect(await credits.getBalance(orgId)).toBeLessThan(before);
      // Style came from the outline, not the default.
      expect(script.script_style).toBe("interview");
      expect(script.outline_id).toBe(outlineId);

      const prompt = provider.lastOptions?.messages[1]?.content ?? "";
      expect(prompt).toContain("Cold open");
      expect(prompt).toContain("Own screen time");

      const detail = await service.findOne(tenant, script.id);
      expect(detail.sections).toHaveLength(2);
      expect(detail.sections[0]!.speaker).toBe("host");
      expect(detail.sections[1]!.speaker).toBe("guest");
    });

    it("derives duration from the words rather than the model's estimate", async () => {
      const script = await service.create(tenant, {
        project_id: projectId,
        outline_id: outlineId,
      });
      const detail = await service.findOne(tenant, script.id);

      // The model claimed 999 seconds for a ~140 word section; the text wins.
      expect(detail.sections[0]!.duration_seconds).toBeLessThan(200);
      expect(detail.word_count).toBeGreaterThan(100);
      expect(detail.estimated_duration_minutes).toBe(
        Math.max(1, Math.round(detail.word_count! / 140)),
      );
    });

    it("surfaces claims to verify and editing notes", async () => {
      const script = await service.create(tenant, {
        project_id: projectId,
        outline_id: outlineId,
      });
      const meta = (await service.findOne(tenant, script.id)).metadata as Record<string, unknown>;

      expect(meta.verify).toEqual(["Confirm the 58% figure before recording"]);
      expect(meta.editing_notes).toEqual(["Trim the pause at 2:15"]);
      expect(typeof meta.readability).toBe("number");
    });

    it("accepts a bare topic when there is no outline", async () => {
      const script = await service.create(tenant, {
        project_id: projectId,
        topic: "A standalone episode",
        style: "solo",
        tone: "casual",
      });
      expect(script.script_style).toBe("solo");
      expect(script.tone).toBe("casual");
      expect(script.outline_id).toBeNull();
    });

    it("rejects a request with neither topic nor outline", async () => {
      await expect(service.create(tenant, { project_id: projectId })).rejects.toMatchObject({
        status: 400,
      });
    });

    it("keeps exactly one current script per project", async () => {
      await service.create(tenant, { project_id: projectId, topic: "One" });
      await service.create(tenant, { project_id: projectId, topic: "Two" });

      const { rows } = await pool.query<{ current: number }>(
        `select count(*) filter (where is_current)::int as current
           from public.scripts where project_id = $1`,
        [projectId],
      );
      expect(rows[0]!.current).toBe(1);
    });

    it("keeps the work when the model returns prose", async () => {
      provider.mode = "prose";
      const script = await service.create(tenant, {
        project_id: projectId,
        topic: "Prose fallback",
      });
      const detail = await service.findOne(tenant, script.id);

      expect((detail.metadata as Record<string, unknown>).unstructured).toBe(true);
      expect(detail.content).toContain("plain prose");
    });

    it("refunds credits when generation fails", async () => {
      provider.mode = "fail";
      const before = await credits.getBalance(orgId);

      await expect(
        service.create(tenant, { project_id: projectId, topic: "Doomed" }),
      ).rejects.toMatchObject({ status: 503 });

      expect(await credits.getBalance(orgId)).toBe(before);
    });

    it("rejects a project and an outline from another tenant", async () => {
      await expect(
        service.create(tenant, { project_id: randomUUID(), topic: "Nope" }),
      ).rejects.toMatchObject({ status: 404 });

      await expect(
        service.create(tenant, { project_id: projectId, outline_id: randomUUID() }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
