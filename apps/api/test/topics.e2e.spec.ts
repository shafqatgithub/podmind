import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { TopicModule } from "../src/topics/topic.module";
import { TopicService } from "../src/topics/topic.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import { buildTopicMessages } from "../src/topics/topic.prompt";
import type { TenantContext } from "../src/tenancy/tenancy.service";
import type {
  AiProvider,
  CompletionOptions,
  CompletionResult,
  ProviderSlug,
} from "../src/ai/providers/provider.types";

/** A provider whose search capability and payload are set per test. */
class Scripted implements AiProvider {
  payload: unknown = {};
  canSearch = true;
  lastOptions: CompletionOptions | null = null;
  calls = 0;

  constructor(readonly slug: ProviderSlug) {}

  isConfigured(): boolean {
    return true;
  }

  supportsWebSearch(): boolean {
    return this.canSearch;
  }

  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.calls += 1;
    this.lastOptions = options;
    return Promise.resolve({
      text: JSON.stringify(this.payload),
      promptTokens: 900,
      completionTokens: 1400,
      model: "claude-opus",
      provider: this.slug,
    });
  }
}

const SOURCE = { title: "A real article", url: "https://example.org/a", publisher: "Example" };

describe("Topic discovery", () => {
  describe("prompt", () => {
    it("requires searching and forbids unsourced topics", () => {
      const [system] = buildTopicMessages({ niche: "productivity" });
      expect(system!.content).toMatch(/You have web search\. Use it/i);
      expect(system!.content).toMatch(/No source, no topic/i);
      expect(system!.content).toMatch(/Never invent a URL/i);
      // The model must not claim platform-specific trending it cannot see.
      expect(system!.content).toMatch(/not platform analytics/i);
    });

    it("carries context and the exclusion list into the prompt", () => {
      const [, user] = buildTopicMessages({
        niche: "fintech",
        audience: "Founders",
        country: "Pakistan",
        podcastName: "Deep Work Radio",
        avoidRecent: ["Already did this one"],
      });
      expect(user!.content).toContain("fintech");
      expect(user!.content).toContain("Founders");
      expect(user!.content).toContain("Pakistan");
      expect(user!.content).toContain("Already did this one");
      // Anchoring the date matters when the task is "what is current".
      expect(user!.content).toContain(new Date().toISOString().slice(0, 10));
    });
  });

  describe("discovery (live schema)", () => {
    let service: TopicService;
    let pool: Pool;
    let anthropic: Scripted;
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
          TopicModule,
        ],
      })
        .overrideProvider(ProviderRegistry)
        .useFactory({
          factory: () => {
            anthropic = new Scripted("anthropic");
            const map = new Map<ProviderSlug, AiProvider>([["anthropic", anthropic]]);
            return {
              get: (slug: ProviderSlug) => map.get(slug),
              configured: () => ["anthropic" as ProviderSlug],
              all: () => [...map.values()],
            } as ProviderRegistry;
          },
        })
        .compile();

      service = moduleRef.get(TopicService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
        ownerId,
        `topics-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,'Topic Org',$2,$3)`,
        [orgId, `topic-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id,name,slug,owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `tws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title, podcast_name, audience)
         values ($1,$2,'Topics','Deep Work Radio','Knowledge workers') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;
      await pool.query(
        `insert into public.ai_credit_balances
           (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 500, 0, 500)`,
        [orgId],
      );
      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.topic_discoveries where project_id = $1`,
        [projectId],
      );
      await pool.query(`delete from public.ai_requests where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    beforeEach(() => {
      anthropic.canSearch = true;
      anthropic.calls = 0;
      anthropic.payload = {
        summary: "Two things moved this week.",
        topics: [
          {
            title: "The attention economy's next act",
            angle: "What changes when regulators arrive",
            why_now: "A bill was tabled last week",
            audience_fit: "Directly affects how they work",
            momentum: "rising",
            search_terms: ["attention economy bill"],
            sources: [SOURCE],
          },
        ],
        gaps: ["Nobody is covering the enforcement angle"],
        avoid: ["Generic screen-time takes"],
      };
    });

    it("asks the provider to search, and stores what came back", async () => {
      const result = await service.discover(tenant, {
        project_id: projectId,
        niche: "productivity",
        country: "Pakistan",
      });

      // The whole feature depends on this flag actually being sent.
      expect(anthropic.lastOptions?.webSearch).toBe(true);

      expect(result.topics).toHaveLength(1);
      const topic = result.topics[0]!;
      expect(topic.title).toContain("attention economy");
      expect(topic.momentum).toBe("rising");
      expect(topic.sources).toHaveLength(1);
      expect((result.metadata as Record<string, unknown>).summary).toBeTruthy();
    });

    it("drops topics with no source rather than presenting them as research", async () => {
      anthropic.payload = {
        topics: [
          { title: "Sourced", momentum: "rising", sources: [SOURCE] },
          { title: "Unsourced claim", momentum: "peaking", sources: [] },
          { title: "Also unsourced", momentum: "steady" },
        ],
      };

      const result = await service.discover(tenant, {
        project_id: projectId,
        niche: "productivity",
      });

      expect(result.topics.map((t) => t.title)).toEqual(["Sourced"]);
      // The count is recorded rather than hidden, so the drop is auditable.
      expect((result.metadata as Record<string, unknown>).dropped_unsourced).toBe(2);
    });

    it("fails loudly when nothing came back with a source", async () => {
      anthropic.payload = { topics: [{ title: "No source at all", sources: [] }] };

      await expect(
        service.discover(tenant, { project_id: projectId, niche: "productivity" }),
      ).rejects.toMatchObject({ status: 503 });
    });

    it("ignores a momentum value it does not recognise", async () => {
      anthropic.payload = {
        topics: [{ title: "Odd momentum", momentum: "EXPLODING", sources: [SOURCE] }],
      };

      const result = await service.discover(tenant, {
        project_id: projectId,
        niche: "productivity",
      });
      // Better blank than a confident-looking label the model invented.
      expect(result.topics[0]!.momentum).toBeNull();
    });

    it("refuses entirely when no configured provider can search", async () => {
      anthropic.canSearch = false;
      expect(service.searchAvailable()).toBe(false);

      await expect(
        service.discover(tenant, { project_id: projectId, niche: "productivity" }),
      ).rejects.toMatchObject({ status: 503 });

      // It must not have quietly answered from model recall instead.
      expect(anthropic.calls).toBe(0);
    });

    it("excludes topics it already found, so a rerun brings new ideas", async () => {
      await service.discover(tenant, { project_id: projectId, niche: "productivity" });
      await service.discover(tenant, { project_id: projectId, niche: "productivity" });

      const [, user] = anthropic.lastOptions!.messages;
      expect(user!.content).toContain("The attention economy's next act");
    });

    it("saves and unsaves a topic within the tenant", async () => {
      const result = await service.discover(tenant, {
        project_id: projectId,
        niche: "productivity",
      });
      const topicId = result.topics[0]!.id;

      expect((await service.setSaved(tenant, topicId, true)).is_saved).toBe(true);
      expect((await service.setSaved(tenant, topicId, false)).is_saved).toBe(false);

      await expect(service.setSaved(tenant, randomUUID(), true)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("rejects a project from another tenant", async () => {
      await expect(
        service.discover(tenant, { project_id: randomUUID(), niche: "x" }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
