import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { validateEnv } from "../src/config/env";
import { DatabaseModule, PG_POOL } from "../src/database/database.module";
import { TenancyModule } from "../src/tenancy/tenancy.module";
import { KnowledgeModule } from "../src/knowledge/knowledge.module";
import { KnowledgeService } from "../src/knowledge/knowledge.service";
import {
  chunkText,
  EmbeddingService,
  EMBEDDING_DIMENSIONS,
} from "../src/ai/embeddings/embedding.service";
import { CreditsService } from "../src/ai/credits/credits.service";
import type { TenantContext } from "../src/tenancy/tenancy.service";

/**
 * Deterministic stand-in for a real embedding model.
 *
 * Vectors are built from word overlap, so semantically related texts land
 * near each other and unrelated ones do not — enough to exercise pgvector's
 * distance ordering and the similarity floor without a network call.
 */
function fakeVector(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    const slot = hash % EMBEDDING_DIMENSIONS;
    vector[slot] = (vector[slot] ?? 0) + 1;
  }
  const norm = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

describe("Knowledge Hub", () => {
  describe("chunking", () => {
    it("splits long text into overlapping chunks on natural boundaries", () => {
      const paragraph = "Attention is a finite resource. ".repeat(60);
      const chunks = chunkText(paragraph);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]!.index).toBe(0);
      chunks.forEach((c) => expect(c.text.length).toBeLessThanOrEqual(1200));
      // Overlap keeps a sentence spanning a boundary retrievable.
      const joined = chunks.map((c) => c.text).join(" ");
      expect(joined.length).toBeGreaterThan(paragraph.trim().length * 0.95);
    });

    it("returns nothing for empty input", () => {
      expect(chunkText("   \n\n  ")).toEqual([]);
    });

    it("keeps a short document as a single chunk", () => {
      expect(chunkText("One short note about podcasting.")).toHaveLength(1);
    });
  });

  describe("ingestion and search (live schema)", () => {
    let service: KnowledgeService;
    let credits: CreditsService;
    let pool: Pool;
    let tenant: TenantContext;
    let embedCalls = 0;

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
          KnowledgeModule,
        ],
      })
        .overrideProvider(EmbeddingService)
        .useFactory({
          inject: [CreditsService],
          factory: (creditsService: CreditsService) =>
            ({
              available: () => ["openai"],
              isAvailable: () => true,
              embed: (inputs: string[]) => {
                embedCalls += 1;
                return Promise.resolve(inputs.map(fakeVector));
              },
              withCredits: async <T>(
                organizationId: string,
                amount: number,
                description: string,
                work: () => Promise<T>,
              ) => {
                const tx = await creditsService.consume(organizationId, amount, description);
                try {
                  return await work();
                } catch (err) {
                  await creditsService.refund(organizationId, amount, `Refund ${tx}`);
                  throw err;
                }
              },
            }) as unknown as EmbeddingService,
        })
        .compile();

      service = moduleRef.get(KnowledgeService);
      credits = moduleRef.get(CreditsService);
      pool = moduleRef.get<Pool>(PG_POOL);

      await pool.query(`insert into auth.users (id, email) values ($1, $2)`, [
        ownerId,
        `kb-${ownerId.slice(0, 8)}@podmind.test`,
      ]);
      await pool.query(
        `insert into public.organizations (id, name, slug, owner_id) values ($1, 'KB Org', $2, $3)`,
        [orgId, `kb-${orgId.slice(0, 8)}`, ownerId],
      );
      const ws = await pool.query<{ id: string }>(
        `insert into public.workspaces (organization_id, name, slug, owner_id)
         values ($1, 'WS', $2, $3) returning id`,
        [orgId, `kbws-${orgId.slice(0, 8)}`, ownerId],
      );
      workspaceId = ws.rows[0]!.id;
      const project = await pool.query<{ id: string }>(
        `insert into public.projects (workspace_id, owner_id, title)
         values ($1, $2, 'Knowledge Project') returning id`,
        [workspaceId, ownerId],
      );
      projectId = project.rows[0]!.id;

      await pool.query(
        `insert into public.ai_credit_balances (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, 100, 0, 100)`,
        [orgId],
      );

      tenant = { userId: ownerId, organizationId: orgId, workspaceId };
    });

    afterAll(async () => {
      await pool.query(
        `delete from public.knowledge_search_history where user_id = $1`,
        [ownerId],
      );
      await pool.query(
        `delete from public.knowledge_bases where project_id = $1`,
        [projectId],
      );
      await pool.query(`delete from public.audit_events where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.projects where workspace_id = $1`, [workspaceId]);
      await pool.query(`delete from public.ai_credit_transactions where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.ai_credit_balances where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.workspaces where organization_id = $1`, [orgId]);
      await pool.query(`delete from public.organizations where id = $1`, [orgId]);
      await pool.query(`delete from auth.users where id = $1`, [ownerId]);
      await pool.end();
    });

    it("ingests a document, stores chunks with vectors, and charges credits", async () => {
      const before = await credits.getBalance(orgId);

      const document = await service.createDocument(tenant, {
        project_id: projectId,
        title: "Attention research notes",
        content:
          "Attention is the scarcest resource in modern media. Listeners choose podcasts " +
          "over other formats because audio fits into commutes and chores. ".repeat(12),
      });

      expect(document.id).toBeTruthy();
      expect(document.chunk_count).toBeGreaterThan(0);
      expect(await credits.getBalance(orgId)).toBe(before - 2);

      const { rows } = await pool.query<{ count: number; with_vector: number }>(
        `select count(*)::int as count,
                count(embedding)::int as with_vector
           from public.knowledge_chunks where document_id = $1`,
        [document.id],
      );
      expect(rows[0]!.count).toBe(document.chunk_count);
      // Every stored chunk is searchable.
      expect(rows[0]!.with_vector).toBe(rows[0]!.count);
    });

    it("rejects identical content before paying to embed it again", async () => {
      const content = "A distinctive note about microphone technique and room treatment.";
      await service.createDocument(tenant, {
        project_id: projectId,
        title: "Mic technique",
        content,
      });

      const before = await credits.getBalance(orgId);
      const callsBefore = embedCalls;

      await expect(
        service.createDocument(tenant, {
          project_id: projectId,
          title: "Mic technique again",
          content,
        }),
      ).rejects.toMatchObject({ status: 409 });

      // No embedding call, no credits: the duplicate is caught first.
      expect(embedCalls).toBe(callsBefore);
      expect(await credits.getBalance(orgId)).toBe(before);
    });

    it("finds the relevant passage by meaning and ranks it first", async () => {
      await service.createDocument(tenant, {
        project_id: projectId,
        title: "Sponsorship pricing",
        content:
          "Sponsorship pricing depends on CPM, downloads per episode and audience niche. " +
          "A specialised audience commands a higher CPM than a general one.",
      });

      const result = await service.search(tenant, {
        project_id: projectId,
        query: "How should I price sponsorship CPM for a niche audience?",
      });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]!.document_title).toBe("Sponsorship pricing");
      expect(result.items[0]!.similarity).toBeGreaterThan(0.25);
      // Ordered by similarity, best first.
      const scores = result.items.map((i) => i.similarity);
      expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    });

    it("records search history", async () => {
      await service.search(tenant, { project_id: projectId, query: "microphone technique" });
      const { rows } = await pool.query<{ query: string }>(
        `select query from public.knowledge_search_history
          where user_id = $1 order by created_at desc limit 1`,
        [ownerId],
      );
      expect(rows[0]!.query).toBe("microphone technique");
    });

    it("returns nothing rather than noise for an unrelated query", async () => {
      const result = await service.search(tenant, {
        project_id: projectId,
        query: "zzzz qqqq xxxx unrelated gibberish token",
      });
      expect(result.items).toHaveLength(0);
    });

    it("deletes a document and its chunks", async () => {
      const document = await service.createDocument(tenant, {
        project_id: projectId,
        title: "Temporary note",
        content: "Something ephemeral about scheduling guests across time zones.",
      });

      await service.deleteDocument(tenant, document.id);

      const { rows } = await pool.query<{ count: number }>(
        `select count(*)::int as count from public.knowledge_chunks where document_id = $1`,
        [document.id],
      );
      expect(rows[0]!.count).toBe(0);

      const list = await service.listDocuments(tenant, projectId);
      expect(list.items.some((d) => d.id === document.id)).toBe(false);
    });

    it("rejects a project from another tenant", async () => {
      await expect(
        service.createDocument(tenant, {
          project_id: randomUUID(),
          title: "Nope",
          content: "This should never be stored anywhere at all.",
        }),
      ).rejects.toMatchObject({ status: 404 });
    });

    it("retrieval for chat never throws and never charges", async () => {
      const before = await credits.getBalance(orgId);
      const passages = await service.retrieveForContext(
        tenant,
        projectId,
        "sponsorship pricing",
      );

      expect(passages.length).toBeGreaterThan(0);
      // Context retrieval is free — it supports another request that already paid.
      expect(await credits.getBalance(orgId)).toBe(before);

      // A project with no knowledge base yields nothing instead of failing.
      await expect(
        service.retrieveForContext(tenant, randomUUID(), "anything"),
      ).resolves.toEqual([]);
    });
  });
});
