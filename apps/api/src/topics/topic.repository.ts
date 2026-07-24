import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface DiscoveryRow {
  id: string;
  project_id: string;
  niche: string;
  audience: string | null;
  country: string | null;
  ai_provider: string | null;
  model_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface TopicRow {
  id: string;
  title: string;
  angle: string | null;
  why_now: string | null;
  audience_fit: string | null;
  momentum: string | null;
  search_terms: string[] | null;
  sources: { title?: string; url?: string; publisher?: string; date?: string }[] | null;
  sort_order: number;
  is_saved: boolean;
}

@Injectable()
export class TopicRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    d.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.podcast_name, p.audience, p.niche, p.language::text as language
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
    return rows[0] as {
      id: string;
      podcast_name: string | null;
      audience: string | null;
      niche: string | null;
      language: string;
    };
  }

  /**
   * Titles this project has already discovered, so a second run does not
   * return the same ideas back. Passed into the prompt as an exclusion list.
   */
  async recentTitles(projectId: string, limit = 20): Promise<string[]> {
    const { rows } = await this.pool.query<{ title: string }>(
      `select t.title
         from public.discovered_topics t
         join public.topic_discoveries d on d.id = t.discovery_id
        where d.project_id = $1
        order by t.created_at desc
        limit $2`,
      [projectId, limit],
    );
    return rows.map((r) => r.title);
  }

  /** The discovery and its topics land together or not at all. */
  async save(
    tenant: TenantContext,
    discovery: {
      projectId: string;
      niche: string;
      audience: string | null;
      country: string | null;
      provider: string;
      model: string;
      metadata: Record<string, unknown>;
    },
    topics: {
      title: string;
      angle: string | null;
      why_now: string | null;
      audience_fit: string | null;
      momentum: string | null;
      search_terms: string[];
      sources: unknown[];
    }[],
  ): Promise<string> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<{ id: string }>(
        `insert into public.topic_discoveries
           (project_id, created_by, niche, audience, country, ai_provider, model_name, metadata)
         values ($1,$2,$3,$4,$5,$6::ai_provider,$7,$8)
         returning id`,
        [
          discovery.projectId,
          tenant.userId,
          discovery.niche,
          discovery.audience,
          discovery.country,
          discovery.provider,
          discovery.model,
          JSON.stringify(discovery.metadata),
        ],
      );
      const discoveryId = rows[0]!.id;

      for (const [index, topic] of topics.entries()) {
        await client.query(
          `insert into public.discovered_topics
             (discovery_id, title, angle, why_now, audience_fit, momentum,
              search_terms, sources, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            discoveryId,
            topic.title,
            topic.angle,
            topic.why_now,
            topic.audience_fit,
            topic.momentum,
            topic.search_terms,
            JSON.stringify(topic.sources),
            index,
          ],
        );
      }

      await client.query("commit");
      return discoveryId;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string) {
    const params: unknown[] = [tenant.organizationId];
    const where = [TopicRepository.TENANT_SCOPE, `d.status <> 'deleted'::record_status`];
    if (projectId) {
      params.push(projectId);
      where.push(`d.project_id = $${params.length}`);
    }
    const { rows } = await this.pool.query(
      `select d.id, d.project_id, d.niche, d.country, d.created_at,
              (select count(*) from public.discovered_topics t where t.discovery_id = d.id)::int
                as topic_count
         from public.topic_discoveries d
        where ${where.join(" and ")}
        order by d.created_at desc
        limit 25`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<DiscoveryRow>(
      `select d.id, d.project_id, d.niche, d.audience, d.country,
              d.ai_provider::text as ai_provider, d.model_name, d.metadata, d.created_at
         from public.topic_discoveries d
        where ${TopicRepository.TENANT_SCOPE} and d.id = $2
          and d.status <> 'deleted'::record_status`,
      [tenant.organizationId, id],
    );
    const discovery = rows[0];
    if (!discovery) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Discovery not found" });
    }

    const topics = await this.pool.query<TopicRow>(
      `select id, title, angle, why_now, audience_fit, momentum,
              search_terms, sources, sort_order, is_saved
         from public.discovered_topics
        where discovery_id = $1
        order by sort_order`,
      [id],
    );
    return { ...discovery, topics: topics.rows };
  }

  async setSaved(tenant: TenantContext, topicId: string, isSaved: boolean) {
    const { rows } = await this.pool.query<{ id: string; is_saved: boolean }>(
      `update public.discovered_topics t
          set is_saved = $3
        from public.topic_discoveries d
       where t.discovery_id = d.id
         and t.id = $2
         and d.project_id in (
           select p.id from public.projects p
            where p.workspace_id in (
              select w.id from public.workspaces w where w.organization_id = $1
            )
         )
       returning t.id, t.is_saved`,
      [tenant.organizationId, topicId, isSaved],
    );
    if (!rows[0]) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Topic not found" });
    }
    return rows[0];
  }

  async remove(tenant: TenantContext, id: string) {
    await this.findOne(tenant, id);
    await this.pool.query(
      `update public.topic_discoveries set status = 'deleted'::record_status where id = $1`,
      [id],
    );
  }
}
