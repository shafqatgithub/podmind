import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { SeoModule } from "../src/seo/seo.module";
import { SocialModule } from "../src/social/social.module";
import { SeoService } from "../src/seo/seo.service";
import { SocialService } from "../src/social/social.service";
import { CreditsService } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import { buildSeoMessages } from "../src/seo/seo.prompt";
import { buildSocialMessages, PLATFORM_RULES } from "../src/social/social.prompt";
import type { TenantContext } from "../src/tenancy/tenancy.service";
import type {
  AiProvider,
  CompletionOptions,
  CompletionResult,
  ProviderSlug,
} from "../src/ai/providers/provider.types";

const SEO_RESPONSE = JSON.stringify({
  target_keyword: "attention economy",
  search_intent: "informational",
  titles: [
    { title: "The Attention Economy Explained", seo_score: 88, click_score: 74, why: "clear" },
    { title: "Why Your Focus Is Being Sold", seo_score: 71, click_score: 91, why: "curiosity" },
  ],
  descriptions: [
    { description: "How the attention economy works and what it costs you.", seo_score: 82 },
  ],
  keywords: [
    { keyword: "digital minimalism", intent: "informational", priority: 2 },
    { keyword: "screen time", intent: "nonsense-intent", priority: 99 },
    { keyword: "", intent: "informational", priority: 1 },
  ],
  tags: ["Attention", "FOCUS"],
  hashtags: ["attention economy", "#Focus"],
  chapters: [
    { title: "Cold open", timestamp_seconds: 0 },
    { title: "The business model", timestamp_seconds: 240 },
    { title: "No timestamp", timestamp_seconds: "bad" },
  ],
  thumbnail_ideas: ["Split screen: phone vs hourglass"],
  ctr_suggestions: ["Lead with the number in the title"],
});

const SOCIAL_RESPONSE = JSON.stringify({
  posts: [
    {
      platform: "linkedin",
      title: "",
      content: "A professional take on the attention economy.",
      hashtags: ["attention", "#focus"],
      cta: "Listen now",
    },
    // Deliberately over the 280 limit — the service must trim it.
    { platform: "x", title: "", content: "x".repeat(400), hashtags: [], cta: "Listen" },
    // Not requested by the caller — must be ignored.
    { platform: "instagram", title: "", content: "Should be ignored", hashtags: [], cta: "" },
    // No content — must be dropped.
    { platform: "linkedin", title: "", content: "", hashtags: [], cta: "" },
  ],
  thread: ["1/ The attention economy…", "2/ …"],
  carousel_ideas: ["Slide 1: the hook"],
  emoji_notes: ["Avoid emoji on LinkedIn"],
});

class ScriptedProvider implements AiProvider {
  response = SEO_RESPONSE;
  lastOptions: CompletionOptions | null = null;
  constructor(readonly slug: ProviderSlug) {}
  isConfigured(): boolean {
    return true;
  }
  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.lastOptions = options;
    return Promise.resolve({
      text: this.response,
      promptTokens: 300,
      completionTokens: 700,
      model: "gpt-5-mini",
      provider: this.slug,
    });
  }
}

describe("SEO and Social engines", () => {
  describe("prompts", () => {
    it("forbids the search figures a model cannot know", () => {
      const [system] = buildSeoMessages({ topic: "Test" });
      expect(system!.content).toMatch(/Never invent search volume/i);
      expect(system!.content).toMatch(/do not have live search data/i);
      expect(system!.content).toMatch(/Never write clickbait/i);
    });

    it("states each platform's real limit rather than asking for one generic post", () => {
      const [system, user] = buildSocialMessages({
        topic: "Test",
        platforms: ["x", "linkedin"],
        tone: "casual",
      });
      expect(system!.content).toMatch(/Do not reword one post six ways/i);
      expect(user!.content).toContain("max 280 characters");
      expect(user!.content).toContain("max 3000 characters");
    });

    it("keeps the published platform limits accurate", () => {
      expect(PLATFORM_RULES.x.limit).toBe(280);
      expect(PLATFORM_RULES.instagram.limit).toBe(2200);
      expect(PLATFORM_RULES.linkedin.limit).toBe(3000);
    });
  });

  describe("generation (live schema)", () => {
    let seo: SeoService;
    let social: SocialService;
    let credits: CreditsService;
    let pool: Pool;
    let provider: ScriptedProvider;
    let tenant: TenantContext;

    const ownerId = randomUUID();
    const orgId = randomUUID();
    let workspaceId: string;
    let projectId: string;
    let scriptId: string;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
          DatabaseModule,
          TenancyModule,
          SeoModule,
          SocialModule,
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

      seo = moduleRef.get(SeoService);
      social = moduleRef.get(SocialService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id,email) values ($1,$2)`, [
        ownerId,
        `seo-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,'SEO Org',$2,$3)`,
        [orgId, `seo-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id,name,slug,owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `seows-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id,owner_id,title,podcast_name,audience)
         values ($1,$2,'Attention Episode','Deep Work Radio','Knowledge workers') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;
      const script = await pool.query<{ id: string }>(
        `insert into public.scripts (project_id, created_by, title, content)
         values ($1,$2,'The script','Full script text about attention.') returning id`,
        [projectId, ownerId],
      );
      scriptId = script.rows[0]!.id;
      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 500, 0, 500)`,
        [orgId],
      );
      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(`delete from public.seo_projects where project_id = $1`, [projectId]);
      await pool.query(`delete from public.social_campaigns where project_id = $1`, [projectId]);
      await pool.query(`delete from public.scripts where project_id = $1`, [projectId]);
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

    it("stores SEO metadata and pre-selects a usable title and description", async () => {
      provider.response = SEO_RESPONSE;
      const before = await credits.getBalance(orgId);

      const result = await seo.create(tenant, {
        project_id: projectId,
        topic: "The attention economy",
      });

      expect(await credits.getBalance(orgId)).toBe(before - 3);
      expect(result.target_keyword).toBe("attention economy");
      expect(result.search_intent).toBe("informational");

      expect(result.titles).toHaveLength(2);
      // Exactly one title and one description are selected by default.
      expect(result.titles.filter((t: { selected: boolean }) => t.selected)).toHaveLength(1);
      expect(result.descriptions.filter((d: { selected: boolean }) => d.selected)).toHaveLength(1);

      // Empty keyword dropped; nonsense intent and out-of-range priority normalised.
      expect(result.keywords).toHaveLength(2);
      const screenTime = result.keywords.find(
        (k: { keyword: string }) => k.keyword === "screen time",
      );
      expect(screenTime.intent).toBeNull();
      expect(Number(screenTime.priority)).toBe(5);

      // Hashtags normalised, tags lowercased.
      expect(result.hashtags.map((h: { hashtag: string }) => h.hashtag)).toEqual(
        expect.arrayContaining(["#attentioneconomy", "#Focus"]),
      );
      expect(result.tags.map((t: { tag: string }) => t.tag)).toEqual(
        expect.arrayContaining(["attention", "focus"]),
      );

      // A non-numeric timestamp becomes 0 rather than breaking the insert.
      expect(result.chapters).toHaveLength(3);

      const meta = result.metadata as Record<string, unknown>;
      expect(meta.thumbnail_ideas).toHaveLength(1);
    });

    it("uses a script's text as the source when one is given", async () => {
      provider.response = SEO_RESPONSE;
      await seo.create(tenant, { project_id: projectId, script_id: scriptId, topic: "From script" });
      const prompt = provider.lastOptions!.messages[1]!.content;
      expect(prompt).toContain("Full script text about attention.");
    });

    it("changes the selected title exclusively", async () => {
      provider.response = SEO_RESPONSE;
      const created = await seo.create(tenant, { project_id: projectId, topic: "Selection test" });
      const second = created.titles[1]!;

      const updated = await seo.select(tenant, created.id, { title_id: second.id });
      const selected = updated.titles.filter((t: { selected: boolean }) => t.selected);
      expect(selected).toHaveLength(1);
      expect(selected[0]!.id).toBe(second.id);
    });

    it("rejects a script from a different project", async () => {
      await expect(
        seo.create(tenant, { project_id: projectId, script_id: randomUUID(), topic: "x" }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("writes one post per requested platform and enforces the character limit", async () => {
      provider.response = SOCIAL_RESPONSE;
      const before = await credits.getBalance(orgId);

      const campaign = await social.create(tenant, {
        project_id: projectId,
        topic: "The attention economy",
        platforms: ["linkedin", "x"],
        tone: "professional",
      });

      expect(await credits.getBalance(orgId)).toBe(before - 3);

      const platforms = campaign.posts.map((p: { platform: string }) => p.platform);
      expect(platforms).toEqual(expect.arrayContaining(["linkedin", "x"]));
      // Instagram was not requested, and the empty post was dropped.
      expect(platforms).not.toContain("instagram");
      expect(campaign.posts).toHaveLength(2);

      const xPost = campaign.posts.find((p: { platform: string }) => p.platform === "x");
      expect(xPost.content.length).toBeLessThanOrEqual(280);
      expect(xPost.character_count).toBe(xPost.content.length);

      const linkedin = campaign.posts.find((p: { platform: string }) => p.platform === "linkedin");
      expect(linkedin.hashtags).toEqual(expect.arrayContaining(["#attention", "#focus"]));

      const meta = campaign.metadata as Record<string, unknown>;
      expect(meta.thread).toHaveLength(2);
    });

    it("rejects a project from another tenant", async () => {
      const otherTenant: TenantContext = {
        userId: ownerId,
        organizationId: randomUUID(),
        workspaceId,
      };
      await expect(
        seo.create(otherTenant, { project_id: projectId, topic: "x" }),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        social.create(otherTenant, { project_id: projectId, platforms: ["x"], topic: "y" }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
