import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { ChatModule } from "../src/chat/chat.module";
import { ChatService } from "../src/chat/chat.service";
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

class ScriptedProvider implements AiProvider {
  mode: "ok" | "fail" = "ok";
  lastOptions: CompletionOptions | null = null;

  constructor(readonly slug: ProviderSlug) {}

  isConfigured(): boolean {
    return true;
  }

  complete(options: CompletionOptions): Promise<CompletionResult> {
    this.lastOptions = options;
    if (this.mode === "fail") {
      return Promise.reject(new ProviderError(this.slug, "provider down", false, 400));
    }
    return Promise.resolve({
      text: "Here are three angles you could open the episode with.",
      promptTokens: 300,
      completionTokens: 120,
      model: "gpt-5-mini",
      provider: this.slug,
    });
  }
}

describe("AI Chat", () => {
  let service: ChatService;
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
        ChatModule,
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

    service = moduleRef.get(ChatService);
    credits = moduleRef.get(CreditsService);
    pool = moduleRef.get<Pool>(PG_POOL);
    moduleRef.get(ModelCatalog).invalidate();

    await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
      ownerId,
      `chat-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    await pool.query(
      `insert into public.organizations (id, name, slug, owner_id) values ($1, 'Chat Org', $2, $3)`,
      [orgId, `chat-${orgId.slice(0, 8)}`, ownerId],
    );
    const ws = await pool.query<{ id: string }>(
      `insert into public.workspaces (organization_id, name, slug, owner_id)
       values ($1, 'WS', $2, $3) returning id`,
      [orgId, `chatws-${orgId.slice(0, 8)}`, ownerId],
    );
    workspaceId = ws.rows[0]!.id;

    const project = await pool.query<{ id: string }>(
      `insert into public.projects (workspace_id, owner_id, title, podcast_name, audience, niche)
       values ($1, $2, 'Chat Episode', 'Deep Work Radio', 'Founders', 'Productivity')
       returning id`,
      [workspaceId, ownerId],
    );
    projectId = project.rows[0]!.id;

    await pool.query(
      `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 200, 0, 200)`,
      [orgId],
    );

    tenant = { userId: ownerId, organizationId: orgId, workspaceId };
  });

  afterAll(async () => {
    await pool.query(`delete from public.ai_memories where user_id = $1`, [ownerId]);
    await pool.query(
      `delete from public.ai_conversations where user_id = $1`,
      [ownerId],
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
  });

  it("stores both turns and rolls up conversation counters", async () => {
    const conversation = await service.createConversation(tenant, { project_id: projectId });
    const before = await credits.getBalance(orgId);

    const result = await service.sendMessage(tenant, conversation.id, {
      content: "Give me three opening angles for this episode.",
    });

    expect(result.assistant_message.role).toBe("assistant");
    expect(result.assistant_message.content).toContain("three angles");
    expect(result.credits_spent).toBe(1);
    expect(await credits.getBalance(orgId)).toBe(before - 1);

    const detail = await service.getConversation(tenant, conversation.id);
    expect(detail.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(detail.total_messages).toBe(2);
    expect(detail.total_tokens).toBe(420);
  });

  it("titles a new conversation from its first message", async () => {
    const conversation = await service.createConversation(tenant, {});
    expect(conversation.title).toBe("New conversation");

    await service.sendMessage(tenant, conversation.id, {
      content: "How do I structure a solo episode?\nSecond line ignored.",
    });

    const detail = await service.getConversation(tenant, conversation.id);
    expect(detail.title).toBe("How do I structure a solo episode?");
  });

  it("carries project context and prior research into the system prompt", async () => {
    // Real research row, so the assistant can reference completed work.
    const session = await pool.query<{ id: string }>(
      `insert into public.research_sessions (project_id, created_by, title, topic, depth)
       values ($1, $2, 'Attention economy', 'attention', 'standard'::research_depth)
       returning id`,
      [projectId, ownerId],
    );
    await pool.query(
      `insert into public.research_results (session_id, ai_agent, title, summary, content)
       values ($1, 'research'::ai_agent, 'Attention economy', 'Attention is finite.', 'x')`,
      [session.rows[0]!.id],
    );

    const conversation = await service.createConversation(tenant, { project_id: projectId });
    await service.sendMessage(tenant, conversation.id, { content: "What should I cover?" });

    const system = provider.lastOptions?.messages[0]?.content ?? "";
    expect(system).toContain("Deep Work Radio");
    expect(system).toContain("Founders");
    expect(system).toContain("Attention economy");
    expect(system).toMatch(/Never invent statistics/i);

    await pool.query(`delete from public.research_sessions where id = $1`, [session.rows[0]!.id]);
  });

  it("includes stored memories about the user", async () => {
    await pool.query(
      `insert into public.ai_memories (user_id, project_id, memory_type, title, content, importance)
       values ($1, $2, 'preference'::memory_type, 'Tone', 'Prefers a conversational tone', 9)`,
      [ownerId, projectId],
    );

    const conversation = await service.createConversation(tenant, { project_id: projectId });
    await service.sendMessage(tenant, conversation.id, { content: "Draft an intro." });

    expect(provider.lastOptions?.messages[0]?.content).toContain("conversational tone");
  });

  it("replays prior turns so the model has conversation memory", async () => {
    const conversation = await service.createConversation(tenant, {});
    await service.sendMessage(tenant, conversation.id, { content: "My show is about chess." });
    await service.sendMessage(tenant, conversation.id, { content: "Suggest a title." });

    const sent = provider.lastOptions?.messages ?? [];
    const replayed = sent.filter((m) => m.role !== "system").map((m) => m.content);
    expect(replayed).toContain("My show is about chess.");
    expect(replayed[replayed.length - 1]).toBe("Suggest a title.");
  });

  it("removes the user turn and refunds when the model fails", async () => {
    const conversation = await service.createConversation(tenant, {});
    provider.mode = "fail";
    const before = await credits.getBalance(orgId);

    await expect(
      service.sendMessage(tenant, conversation.id, { content: "This will fail." }),
    ).rejects.toMatchObject({ status: 503 });

    expect(await credits.getBalance(orgId)).toBe(before);
    const detail = await service.getConversation(tenant, conversation.id);
    // No orphan question left hanging in the thread.
    expect(detail.messages).toHaveLength(0);
  });

  it("hides another user's conversation", async () => {
    const otherUser = randomUUID();
    await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
      otherUser,
      `other-chat-${otherUser.slice(0, 8)}@podmind.test`,
    ]);
    const theirs = await pool.query<{ id: string }>(
      `insert into public.ai_conversations (user_id, title) values ($1, 'Theirs') returning id`,
      [otherUser],
    );

    await expect(service.getConversation(tenant, theirs.rows[0]!.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      service.sendMessage(tenant, theirs.rows[0]!.id, { content: "hi" }),
    ).rejects.toMatchObject({ status: 404 });

    await pool.query(`delete from public.ai_conversations where user_id = $1`, [otherUser]);
    await pool.query(`delete from auth.users where id = $1`, [otherUser]);
  });

  it("rejects a project from another tenant", async () => {
    await expect(
      service.createConversation(tenant, { project_id: randomUUID() }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("lists, pins and archives conversations", async () => {
    const conversation = await service.createConversation(tenant, { title: "Pinned one" });
    await service.updateConversation(tenant, conversation.id, { is_pinned: true });

    const page = await service.listConversations(tenant, {});
    expect(page.items[0]?.id).toBe(conversation.id); // pinned float to the top

    await service.updateConversation(tenant, conversation.id, { is_archived: true });
    const afterArchive = await service.listConversations(tenant, {});
    expect(afterArchive.items.some((c) => c.id === conversation.id)).toBe(false);

    const withArchived = await service.listConversations(tenant, { include_archived: true });
    expect(withArchived.items.some((c) => c.id === conversation.id)).toBe(true);
  });

  it("deletes a conversation and its messages", async () => {
    const conversation = await service.createConversation(tenant, {});
    await service.sendMessage(tenant, conversation.id, { content: "Temporary." });

    await service.deleteConversation(tenant, conversation.id);

    await expect(service.getConversation(tenant, conversation.id)).rejects.toMatchObject({
      status: 404,
    });
    const { rows } = await pool.query(
      `select count(*)::int as count from public.ai_messages where conversation_id = $1`,
      [conversation.id],
    );
    expect((rows[0] as { count: number }).count).toBe(0);
  });
});
