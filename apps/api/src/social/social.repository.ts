import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface SocialCampaignRow {
  id: string;
  project_id: string;
  script_id: string | null;
  title: string;
  description: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SocialPostInput {
  platform: string;
  title: string | null;
  content: string;
  hashtags: string[];
  cta: string | null;
}

@Injectable()
export class SocialRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    c.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.language::text as language
         from public.projects p
        where p.id = $2
          and p.workspace_id in (
            select w.id from public.workspaces w where w.organization_id = $1
          )`,
      [tenant.organizationId, projectId],
    );
    const project = rows[0];
    if (!project) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return project as {
      id: string; title: string; podcast_name: string | null;
      audience: string | null; language: string;
    };
  }

  async findScriptText(projectId: string, scriptId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ content: string | null }>(
      `select content from public.scripts where id = $1 and project_id = $2`,
      [scriptId, projectId],
    );
    if (rows.length === 0) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Script not found" });
    }
    return rows[0]!.content;
  }

  /** Campaign, posts and hashtags land together or not at all. */
  async save(
    tenant: TenantContext,
    campaign: {
      projectId: string;
      scriptId: string | null;
      title: string;
      description: string | null;
      metadata: Record<string, unknown>;
    },
    posts: SocialPostInput[],
  ): Promise<string> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<{ id: string }>(
        `insert into public.social_campaigns
           (project_id, script_id, title, description, created_by, metadata)
         values ($1,$2,$3,$4,$5,$6::jsonb) returning id`,
        [
          campaign.projectId,
          campaign.scriptId,
          campaign.title,
          campaign.description,
          tenant.userId,
          JSON.stringify(campaign.metadata),
        ],
      );
      const campaignId = rows[0]!.id;

      for (const post of posts) {
        const { rows: postRows } = await client.query<{ id: string }>(
          `insert into public.social_posts
             (campaign_id, platform, title, content, character_count, word_count, ai_generated)
           values ($1,$2::social_platform,$3,$4,$5,$6,true) returning id`,
          [
            campaignId,
            post.platform,
            post.title,
            post.content,
            post.content.length,
            post.content.trim().split(/\s+/).filter(Boolean).length,
          ],
        );
        for (const hashtag of post.hashtags) {
          await client.query(
            `insert into public.social_post_hashtags (post_id, hashtag) values ($1,$2)`,
            [postRows[0]!.id, hashtag],
          );
        }
      }

      await client.query("commit");
      return campaignId;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string) {
    const params: unknown[] = [tenant.organizationId];
    const where = [SocialRepository.TENANT_SCOPE];
    if (projectId) {
      params.push(projectId);
      where.push(`c.project_id = $${params.length}`);
    }
    const { rows } = await this.pool.query(
      `select c.id, c.project_id, c.script_id, c.title, c.description,
              c.status::text as status, c.metadata, c.created_at, c.updated_at,
              (select count(*) from public.social_posts p where p.campaign_id = c.id) as post_count
         from public.social_campaigns c
        where ${where.join(" and ")}
        order by c.created_at desc limit 50`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<SocialCampaignRow>(
      `select c.id, c.project_id, c.script_id, c.title, c.description,
              c.status::text as status, c.metadata, c.created_at, c.updated_at
         from public.social_campaigns c
        where ${SocialRepository.TENANT_SCOPE} and c.id = $2`,
      [tenant.organizationId, id],
    );
    const campaign = rows[0];
    if (!campaign) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Campaign not found" });
    }

    const { rows: posts } = await this.pool.query(
      `select p.id, p.platform::text as platform, p.title, p.content,
              p.character_count, p.word_count, p.status::text as status,
              coalesce(
                (select json_agg(h.hashtag order by h.hashtag)
                   from public.social_post_hashtags h where h.post_id = p.id),
                '[]'::json
              ) as hashtags
         from public.social_posts p
        where p.campaign_id = $1
        order by p.created_at`,
      [id],
    );

    return { ...campaign, posts };
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.social_campaigns where id = $1`, [id]);
  }
}
