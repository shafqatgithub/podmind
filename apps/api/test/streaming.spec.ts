import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { AiModule } from "../src/ai/ai.module";
import { AiRouterService } from "../src/ai/routing/ai-router.service";
import { CreditsService } from "../src/ai/credits/credits.service";
import { ProviderRegistry } from "../src/ai/providers/provider.registry";
import { ModelCatalog } from "../src/ai/routing/model-catalog";
import {
  ProviderError,
  type AiProvider,
  type CompletionOptions,
  type CompletionResult,
  type ProviderSlug,
  type StreamEvent,
} from "../src/ai/providers/provider.types";

/** A provider whose stream is scripted per test. */
class ScriptedStream implements AiProvider {
  script: (() => AsyncIterable<StreamEvent>) | null = null;
  streamCalls = 0;

  constructor(readonly slug: ProviderSlug) {}

  isConfigured(): boolean {
    return true;
  }

  complete(): Promise<CompletionResult> {
    return Promise.reject(new ProviderError(this.slug, "complete not used here", false));
  }

  stream(_options: CompletionOptions): AsyncIterable<StreamEvent> {
    this.streamCalls += 1;
    if (!this.script) throw new ProviderError(this.slug, "no script", false);
    return this.script();
  }
}

/** A provider with no stream() at all — the Router must skip it. */
class NonStreaming implements AiProvider {
  completeCalls = 0;
  constructor(readonly slug: ProviderSlug) {}
  isConfigured(): boolean {
    return true;
  }
  complete(): Promise<CompletionResult> {
    this.completeCalls += 1;
    return Promise.resolve({
      text: "non-streamed",
      promptTokens: 1,
      completionTokens: 1,
      model: "m",
      provider: this.slug,
    });
  }
}

async function collect(stream: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of stream) events.push(event);
  return events;
}

describe("Streaming", () => {
  let router: AiRouterService;
  let credits: CreditsService;
  let pool: Pool;
  let openai: ScriptedStream;
  let anthropic: ScriptedStream;
  let google: NonStreaming;

  const ownerId = randomUUID();
  const orgId = randomUUID();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        DatabaseModule,
        AiModule,
      ],
    })
      .overrideProvider(ProviderRegistry)
      .useFactory({
        factory: () => {
          openai = new ScriptedStream("openai");
          anthropic = new ScriptedStream("anthropic");
          google = new NonStreaming("google");
          const map = new Map<ProviderSlug, AiProvider>([
            ["openai", openai],
            ["anthropic", anthropic],
            ["google", google],
          ]);
          return {
            get: (slug: ProviderSlug) => map.get(slug),
            configured: () => [...map.keys()],
            all: () => [...map.values()],
          } as ProviderRegistry;
        },
      })
      .compile();

    router = moduleRef.get(AiRouterService);
    credits = moduleRef.get(CreditsService);
    pool = moduleRef.get<Pool>(PG_POOL);
    moduleRef.get(ModelCatalog).invalidate();

    await pool.query(`insert into auth.users (id, email) values ($1,$2)`, [
      ownerId,
      `stream-${ownerId.slice(0, 8)}@podmind.test`,
    ]);
    await pool.query(
      `insert into public.organizations (id,name,slug,owner_id) values ($1,'Stream Org',$2,$3)`,
      [orgId, `stream-${orgId.slice(0, 8)}`, ownerId],
    );
    await pool.query(
      `insert into public.ai_credit_balances
         (organization_id, available_credits, used_credits, purchased_credits)
       values ($1, 500, 0, 500)`,
      [orgId],
    );
  });

  afterAll(async () => {
    await pool.query(`delete from public.ai_requests where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
    await pool.query(`delete from public.organizations where id = $1`, [orgId]);
    await pool.query(`delete from auth.users where id = $1`, [ownerId]);
    await pool.end();
  });

  beforeEach(() => {
    openai.script = null;
    anthropic.script = null;
    openai.streamCalls = 0;
    anthropic.streamCalls = 0;
    google.completeCalls = 0;
  });

  const request = () => ({
    organizationId: orgId,
    task: "chat" as const,
    messages: [{ role: "user" as const, content: "hello" }],
  });

  it("yields each delta and closes with the token tally and provider", async () => {
    openai.script = async function* () {
      yield { type: "delta", text: "Hel" } as StreamEvent;
      yield { type: "delta", text: "lo" } as StreamEvent;
      yield { type: "done", promptTokens: 8, completionTokens: 2, model: "gpt-5-mini" } as StreamEvent;
    };

    const events = await collect(router.routeStream(request()));
    const deltas = events.filter((e) => e.type === "delta");
    const done = events.find((e) => e.type === "done");

    expect(deltas.map((d) => (d as { text: string }).text).join("")).toBe("Hello");
    expect(done).toMatchObject({ promptTokens: 8, completionTokens: 2 });
    // The provider is attached by the Router, which is the only layer that
    // knows which one answered — the chat table needs it for its enum column.
    expect((done as { provider?: string }).provider).toBeTruthy();
  });

  it("charges once for a successful stream", async () => {
    openai.script = async function* () {
      yield { type: "delta", text: "ok" } as StreamEvent;
      yield { type: "done", promptTokens: 1, completionTokens: 1, model: "m" } as StreamEvent;
    };

    const before = await credits.getBalance(orgId);
    await collect(router.routeStream(request()));
    expect(await credits.getBalance(orgId)).toBe(before - 1);
  });

  it("moves to the next provider when the first fails before any output", async () => {
    openai.script = async function* () {
      throw new ProviderError("openai", "upstream exploded", true);
      // eslint-disable-next-line no-unreachable
      yield { type: "delta", text: "" } as StreamEvent;
    };
    anthropic.script = async function* () {
      yield { type: "delta", text: "recovered" } as StreamEvent;
      yield { type: "done", promptTokens: 1, completionTokens: 1, model: "claude" } as StreamEvent;
    };

    const events = await collect(router.routeStream(request()));
    const text = events
      .filter((e) => e.type === "delta")
      .map((e) => (e as { text: string }).text)
      .join("");

    expect(text).toBe("recovered");
    expect(anthropic.streamCalls).toBe(1);
  });

  it("does not fall back once text has reached the user", async () => {
    // Splicing a second model onto a half-written sentence reads as
    // corruption, so a mid-stream failure ends the turn instead.
    openai.script = async function* () {
      yield { type: "delta", text: "Half a sentence" } as StreamEvent;
      throw new ProviderError("openai", "died mid-stream", true);
    };
    anthropic.script = async function* () {
      yield { type: "delta", text: "SHOULD NOT APPEAR" } as StreamEvent;
    };

    const events = await collect(router.routeStream(request()));
    const text = events
      .filter((e) => e.type === "delta")
      .map((e) => (e as { text: string }).text)
      .join("");

    expect(text).toBe("Half a sentence");
    expect(anthropic.streamCalls).toBe(0);
    expect(events[events.length - 1]!.type).toBe("done");
  });

  it("skips providers that cannot stream rather than silently downgrading", async () => {
    openai.script = async function* () {
      throw new ProviderError("openai", "no", true);
      // eslint-disable-next-line no-unreachable
      yield { type: "delta", text: "" } as StreamEvent;
    };
    anthropic.script = async function* () {
      throw new ProviderError("anthropic", "no", true);
      // eslint-disable-next-line no-unreachable
      yield { type: "delta", text: "" } as StreamEvent;
    };

    await expect(collect(router.routeStream(request()))).rejects.toBeInstanceOf(ProviderError);
    // The non-streaming provider was never asked to complete() instead: a
    // caller that asked to stream has committed to that shape.
    expect(google.completeCalls).toBe(0);
  });

  it("refunds the credit when every provider fails", async () => {
    openai.script = async function* () {
      throw new ProviderError("openai", "down", true);
      // eslint-disable-next-line no-unreachable
      yield { type: "delta", text: "" } as StreamEvent;
    };
    anthropic.script = async function* () {
      throw new ProviderError("anthropic", "down", true);
      // eslint-disable-next-line no-unreachable
      yield { type: "delta", text: "" } as StreamEvent;
    };

    const before = await credits.getBalance(orgId);
    await expect(collect(router.routeStream(request()))).rejects.toThrow();
    expect(await credits.getBalance(orgId)).toBe(before);
  });

  it("records telemetry for the attempt", async () => {
    openai.script = async function* () {
      yield { type: "delta", text: "logged" } as StreamEvent;
      yield { type: "done", promptTokens: 5, completionTokens: 3, model: "m" } as StreamEvent;
    };

    await collect(router.routeStream(request()));

    const { rows } = await pool.query<{ success: boolean; total_tokens: number }>(
      `select success, total_tokens from public.ai_requests
        where organization_id = $1 order by created_at desc limit 1`,
      [orgId],
    );
    expect(rows[0]!.success).toBe(true);
    expect(Number(rows[0]!.total_tokens)).toBe(8);
  });
});
