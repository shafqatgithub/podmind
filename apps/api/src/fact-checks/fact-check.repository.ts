import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface FactCheckRow {
  id: string;
  project_id: string;
  script_id: string | null;
  research_session_id: string | null;
  title: string;
  ai_provider: string | null;
  model_name: string | null;
  total_claims: number;
  verified_claims: number;
  flagged_claims: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ClaimRow {
  id: string;
  claim: string;
  claim_type: string;
  verdict: string;
  confidence: string | number | null;
  explanation: string | null;
  correction: string | null;
  evidence: unknown;
  sort_order: number;
}

const CHECK_COLUMNS = `f.id, f.project_id, f.script_id, f.research_session_id, f.title,
  f.ai_provider::text as ai_provider, f.model_name, f.total_claims,
  f.verified_claims, f.flagged_claims, f.metadata, f.created_at`;

@Injectable()
export class FactCheckRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    f.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async findProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.language::text as language
         from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return rows[0] as { id: string; title: string; language: string };
  }

  /** The script's spoken text, so a check can run against what will be said. */
  async findScriptText(tenant: TenantContext, scriptId: string) {
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      content: string | null;
      project_id: string;
    }>(
      `select s.id, s.title, s.content, s.project_id
         from public.scripts s
         join public.projects p on p.id = s.project_id
         join public.workspaces w on w.id = p.workspace_id
        where s.id = $2 and w.organization_id = $1`,
      [tenant.organizationId, scriptId],
    );
    const script = rows[0];
    if (!script) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Script not found" });
    }
    return script;
  }

  /** Research summary and structured claims worth checking. */
  async findResearchText(tenant: TenantContext, sessionId: string) {
    const { rows } = await this.pool.query<{
      id: string;
      title: string;
      project_id: string;
      summary: string | null;
      content: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `select rs.id, rs.title, rs.project_id, rr.summary, rr.content, rr.metadata
         from public.research_sessions rs
         join public.projects p on p.id = rs.project_id
         join public.workspaces w on w.id = p.workspace_id
         left join lateral (
           select summary, content, metadata from public.research_results
            where session_id = rs.id order by created_at desc limit 1
         ) rr on true
        where rs.id = $2 and w.organization_id = $1`,
      [tenant.organizationId, sessionId],
    );
    const session = rows[0];
    if (!session) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Research session not found",
      });
    }
    return session;
  }

  /** Check and claims are written together; a check with no claims is a lie. */
  async saveCheck(input: {
    tenant: TenantContext;
    projectId: string;
    scriptId: string | null;
    researchSessionId: string | null;
    title: string;
    sourceText: string;
    provider: string;
    model: string;
    metadata: Record<string, unknown>;
    claims: {
      claim: string;
      claimType: string;
      verdict: string;
      confidence: number | null;
      explanation: string | null;
      correction: string | null;
      evidence: string[];
    }[];
    verifiedCount: number;
    flaggedCount: number;
  }): Promise<FactCheckRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<FactCheckRow>(
        `insert into public.fact_checks
           (project_id, script_id, research_session_id, created_by, title,
            source_text, ai_provider, model_name, total_claims,
            verified_claims, flagged_claims, metadata)
         values ($1,$2,$3,$4,$5,$6,$7::ai_provider,$8,$9,$10,$11,$12)
         returning id, project_id, script_id, research_session_id, title,
                   ai_provider::text as ai_provider, model_name, total_claims,
                   verified_claims, flagged_claims, metadata, created_at`,
        [
          input.projectId,
          input.scriptId,
          input.researchSessionId,
          input.tenant.userId,
          input.title,
          // Truncated: the check is the artefact, not a second copy of the
          // script, but enough context is kept to see what was checked.
          input.sourceText.slice(0, 20000),
          input.provider,
          input.model,
          input.claims.length,
          input.verifiedCount,
          input.flaggedCount,
          JSON.stringify(input.metadata),
        ],
      );
      const check = rows[0]!;

      for (const [index, claim] of input.claims.entries()) {
        await client.query(
          `insert into public.fact_check_claims
             (fact_check_id, claim, claim_type, verdict, confidence,
              explanation, correction, evidence, sort_order)
           values ($1,$2,$3::claim_type,$4::claim_verdict,$5,$6,$7,$8,$9)`,
          [
            check.id,
            claim.claim,
            claim.claimType,
            claim.verdict,
            claim.confidence,
            claim.explanation,
            claim.correction,
            JSON.stringify(claim.evidence),
            index,
          ],
        );
      }

      await client.query("commit");
      return check;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string): Promise<FactCheckRow[]> {
    const params: unknown[] = [tenant.organizationId];
    let where = `${FactCheckRepository.TENANT_SCOPE} and f.status <> 'deleted'::record_status`;
    if (projectId) {
      params.push(projectId);
      where += ` and f.project_id = $${params.length}`;
    }
    const { rows } = await this.pool.query<FactCheckRow>(
      `select ${CHECK_COLUMNS} from public.fact_checks f
        where ${where}
        order by f.created_at desc
        limit 50`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<FactCheckRow>(
      `select ${CHECK_COLUMNS} from public.fact_checks f
        where ${FactCheckRepository.TENANT_SCOPE} and f.id = $2
          and f.status <> 'deleted'::record_status`,
      [tenant.organizationId, id],
    );
    const check = rows[0];
    if (!check) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Fact check not found" });
    }

    const claims = await this.pool.query<ClaimRow>(
      `select id, claim, claim_type::text as claim_type, verdict::text as verdict,
              confidence, explanation, correction, evidence, sort_order
         from public.fact_check_claims
        where fact_check_id = $1
        order by sort_order asc`,
      [id],
    );

    return {
      ...check,
      claims: claims.rows.map((c) => ({
        ...c,
        confidence: c.confidence === null ? null : Number(c.confidence),
      })),
    };
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(
      `update public.fact_checks set status = 'deleted'::record_status, updated_at = now()
        where id = $1`,
      [id],
    );
  }
}
