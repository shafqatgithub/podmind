import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { GuestModule } from "../src/guests/guest.module";
import { GuestService } from "../src/guests/guest.service";
import { CreditsService } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import { buildGuestMessages } from "../src/guests/guest.prompt";
import type { TenantContext } from "../src/tenancy/tenancy.service";
import type {
  AiProvider,
  CompletionOptions,
  CompletionResult,
  ProviderSlug,
} from "../src/ai/providers/provider.types";

const GOOD = JSON.stringify({
  headline: "Co-founder of a payments company",
  biography: "A four sentence factual biography of the guest.",
  job_title: "CEO",
  company: "Example Payments",
  industry: "Fintech",
  country: "Ireland",
  career_timeline: [{ date: "2010", event: "Founded the company" }],
  companies: [
    {
      company_name: "Example Payments",
      role: "CEO",
      start_year: "2010",
      end_year: "",
      is_current: true,
      description: "Payments infrastructure",
    },
    { company_name: "", role: "ignored because unnamed" },
  ],
  books: [{ title: "A Real Book", publisher: "Publisher", year: "2019", description: "About X" }],
  awards: ["A documented award"],
  interviews: [
    { platform: "Some Podcast", title: "An episode", url: "https://example.org/ep", year: "2023", summary: "Discussed payments" },
  ],
  social_profiles: [
    { platform: "linkedin", username: "someone", profile_url: "https://linkedin.com/in/someone" },
    { platform: "myspace", username: "nope", profile_url: "" },
  ],
  interesting_facts: ["Started coding at 12"],
  controversies: [],
  conversation_opportunities: ["The shift to instant settlement"],
  ice_breakers: ["What did you build first?"],
  smart_questions: ["How did the pricing model evolve?"],
  difficult_questions: ["How do you answer the interchange criticism?"],
  fun_questions: ["Best airport in the world?"],
  closing_questions: ["What should we watch next year?"],
  uncertainties: ["Exact founding month is unclear"],
  sources: [{ title: "Company about page", url: "https://example.org/about" }],
  confidence_score: 0.66,
});

class ScriptedProvider implements AiProvider {
  mode: "ok" | "prose" = "ok";
  lastOptions: CompletionOptions | null = null;
  constructor(readonly slug: ProviderSlug) {}
  isConfigured(): boolean {
    return true;
  }
  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.lastOptions = options;
    return Promise.resolve({
      text: this.mode === "prose" ? "Just some prose about the person." : GOOD,
      promptTokens: 500,
      completionTokens: 900,
      model: "gpt-5",
      provider: this.slug,
    });
  }
}

describe("Guest Intelligence", () => {
  describe("prompt", () => {
    it("carries the anti-fabrication rules the module depends on", () => {
      const [system] = buildGuestMessages({ fullName: "A Person" });
      expect(system!.content).toMatch(/real, living, named individual/i);
      expect(system!.content).toMatch(/Never fabricate quotes/i);
      expect(system!.content).toMatch(/ONLY if it is well documented/i);
      expect(system!.content).toMatch(/Never state a private detail/i);
    });

    it("asks the model to declare identity confusion instead of guessing", () => {
      const [, user] = buildGuestMessages({ fullName: "John Smith", context: "the investor" });
      expect(user!.content).toMatch(/does not clearly identify one person/i);
      expect(user!.content).toContain("the investor");
    });
  });

  describe("research (live schema)", () => {
    let service: GuestService;
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
          GuestModule,
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

      service = moduleRef.get(GuestService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);
      moduleRef.get(ModelCatalog).invalidate();

      await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
        ownerId,
        `guest-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1,'Guest Org',$2,$3)`,
        [orgId, `guest-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1,'WS',$2,$3) returning id`,
        [orgId, `gws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title, podcast_name, niche)
         values ($1,$2,'Guest Episode','Deep Work Radio','Fintech') returning id`,
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
        `delete from public.guests where project_id = $1`,
        [projectId],
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

    it("stores the full briefing across every related table", async () => {
      const before = await credits.getBalance(orgId);

      const guest = await service.research(tenant, {
        project_id: projectId,
        full_name: "Test Guest",
        context: "CEO of Example Payments",
      });

      expect(await credits.getBalance(orgId)).toBe(before - 8);

      expect(guest.full_name).toBe("Test Guest");
      expect(guest.headline).toMatch(/payments/i);
      expect(guest.company).toBe("Example Payments");
      expect(guest.slug).toBeTruthy();

      expect(guest.companies).toHaveLength(1); // unnamed company dropped
      expect(guest.companies[0]!.is_current).toBe(true);
      expect(guest.books[0]!.title).toBe("A Real Book");
      expect(guest.interviews[0]!.interview_url).toBe("https://example.org/ep");

      // Unknown social platforms must not reach the enum column.
      expect(guest.social_profiles).toHaveLength(1);
      expect(guest.social_profiles[0]!.platform).toBe("linkedin");

      // All five question buckets land with their type and difficulty.
      const types = guest.questions.map((q: { question_type: string }) => q.question_type);
      expect(new Set(types)).toEqual(
        new Set(["ice_breaker", "smart", "difficult", "fun", "closing"]),
      );
      expect(guest.questions.every((q: { ai_generated: boolean }) => q.ai_generated)).toBe(true);

      const meta = guest.metadata as Record<string, unknown>;
      expect(meta.confidence_score).toBeCloseTo(0.66, 2);
      expect(meta.uncertainties).toHaveLength(1);
      expect(meta.controversies).toEqual([]);
    });

    it("converts a bare year into a valid date and drops unusable ones", async () => {
      const guest = await service.research(tenant, {
        project_id: projectId,
        full_name: "Year Guest",
      });
      const company = guest.companies[0]!;
      expect(String(company.start_date)).toContain("2010");
      expect(company.end_date).toBeNull(); // empty end_year, still current
    });

    it("keeps the work when the model returns prose", async () => {
      provider.mode = "prose";
      const guest = await service.research(tenant, {
        project_id: projectId,
        full_name: "Prose Guest",
      });
      expect(guest.biography).toContain("prose about the person");
      expect((guest.metadata as Record<string, unknown>).unstructured).toBe(true);
    });

    it("adds a guest manually without spending credits", async () => {
      const before = await credits.getBalance(orgId);
      const guest = await service.createManual(tenant, {
        project_id: projectId,
        full_name: "Manual Guest",
        company: "Somewhere",
      });
      expect(guest.full_name).toBe("Manual Guest");
      expect(guest.questions).toHaveLength(0);
      expect(await credits.getBalance(orgId)).toBe(before);
    });

    it("stores notes and lists guests within the tenant", async () => {
      const guest = await service.createManual(tenant, {
        project_id: projectId,
        full_name: "Noted Guest",
      });
      await service.addNote(tenant, guest.id, "Follow up in March");

      const detail = await service.findOne(tenant, guest.id);
      expect(detail.notes[0]!.note).toBe("Follow up in March");

      const list = await service.list(tenant, { project_id: projectId });
      expect(list.items.some((g) => g.id === guest.id)).toBe(true);
    });

    it("rejects a project belonging to another tenant", async () => {
      const otherOwner = randomUUID();
      const otherOrg = randomUUID();
      await pool.query(`insert into auth.users (id,email) values ($1,$2)`, [
        otherOwner,
        `og-${otherOwner.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id,name,slug,owner_id) values ($1,'Other',$2,$3)`,
        [otherOrg, `og-${otherOrg.slice(0, 8)}`, otherOwner],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id,name,slug,owner_id)
         values ($1,'W',$2,$3) returning id`,
        [otherOrg, `ogw-${otherOrg.slice(0, 8)}`, otherOwner],
      );
      const p = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id,owner_id,title) values ($1,$2,'Theirs') returning id`,
        [ws.rows[0]!.id, otherOwner],
      );

      await expect(
        service.research(tenant, { project_id: p.rows[0]!.id, full_name: "X" }),
      ).rejects.toMatchObject({ status: 404 });

      await pool.query(`delete from public.projects where workspace_id = $1`, [ws.rows[0]!.id]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [otherOrg]);
      await pool.query(`delete from public.audit_events where organization_id = $1`, [otherOrg]);
      await pool.query(`delete from public.organizations where id = $1`, [otherOrg]);
      await pool.query(`delete from auth.users where id = $1`, [otherOwner]);
    });

    it("soft-deletes a guest", async () => {
      const guest = await service.createManual(tenant, {
        project_id: projectId,
        full_name: "Deletable Guest",
      });
      await service.remove(tenant, guest.id);
      await expect(service.findOne(tenant, guest.id)).rejects.toMatchObject({ status: 404 });
    });
  });
});
