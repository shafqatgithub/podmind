import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";

export interface SeoProjectRow {
  id: string;
  project_id: string;
  script_id: string | null;
  title: string;
  target_keyword: string | null;
  secondary_keywords: unknown;
  search_intent: string | null;
  target_country: string | null;
  target_language: string | null;
  score: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface SeoBundle {
  titles: { title: string; seoScore: number | null; clickScore: number | null }[];
  descriptions: { description: string; seoScore: number | null }[];
  keywords: { keyword: string; intent: string | null; priority: number | null }[];
  tags: string[];
  hashtags: string[];
  chapters: { title: string; timestampSeconds: number }[];
}

const SEO_COLUMNS = `s.id, s.project_id, s.script_id, s.title, s.target_keyword,
                     s.secondary_keywords, s.search_intent, s.target_country,
                     s.target_language::text as target_language, s.score, s.metadata,
                     s.created_at, s.updated_at`;

@Injectable()
export class SeoRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  private static readonly TENANT_SCOPE = `
    s.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(tenant: TenantContext, projectId: string) {
    const { rows } = await this.pool.query(
      `select p.id, p.title, p.podcast_name, p.audience, p.niche, p.language::text as language
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
      id: string;
      title: string;
      podcast_name: string | null;
      audience: string | null;
      niche: string | null;
      language: string;
    };
  }

  /** Loads a script's text, confirming it belongs to the same project. */
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

  /** One transaction so a set of metadata is never half-written. */
  async save(
    tenant: TenantContext,
    head: {
      projectId: string;
      scriptId: string | null;
      title: string;
      targetKeyword: string | null;
      secondaryKeywords: string[];
      searchIntent: string | null;
      targetCountry: string | null;
      targetLanguage: string;
      score: number | null;
      metadata: Record<string, unknown>;
    },
    bundle: SeoBundle,
  ): Promise<string> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<{ id: string }>(
        `insert into public.seo_projects
           (project_id, script_id, title, target_keyword, secondary_keywords,
            search_intent, target_country, target_language, score, metadata, created_by)
         values ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::language_code,$9,$10::jsonb,$11)
         returning id`,
        [
          head.projectId,
          head.scriptId,
          head.title,
          head.targetKeyword,
          JSON.stringify(head.secondaryKeywords),
          head.searchIntent,
          head.targetCountry,
          head.targetLanguage,
          head.score,
          JSON.stringify(head.metadata),
          tenant.userId,
        ],
      );
      const seoId = rows[0]!.id;

      // The first title and description are pre-selected: a host who does
      // nothing still ends up with usable metadata.
      for (const [i, t] of bundle.titles.entries()) {
        await client.query(
          `insert into public.seo_titles
             (seo_project_id, title, ai_generated, seo_score, click_score, selected)
           values ($1,$2,true,$3,$4,$5)`,
          [seoId, t.title, t.seoScore, t.clickScore, i === 0],
        );
      }
      for (const [i, d] of bundle.descriptions.entries()) {
        await client.query(
          `insert into public.seo_descriptions
             (seo_project_id, description, ai_generated, seo_score, selected)
           values ($1,$2,true,$3,$4)`,
          [seoId, d.description, d.seoScore, i === 0],
        );
      }
      for (const k of bundle.keywords) {
        await client.query(
          `insert into public.seo_keywords (seo_project_id, keyword, intent, priority)
           values ($1,$2,$3,$4)`,
          [seoId, k.keyword, k.intent, k.priority],
        );
      }
      for (const tag of bundle.tags) {
        await client.query(
          `insert into public.seo_tags (seo_project_id, tag, selected) values ($1,$2,true)`,
          [seoId, tag],
        );
      }
      for (const h of bundle.hashtags) {
        await client.query(
          `insert into public.seo_hashtags (seo_project_id, hashtag) values ($1,$2)`,
          [seoId, h],
        );
      }
      for (const c of bundle.chapters) {
        await client.query(
          `insert into public.seo_chapters (seo_project_id, title, timestamp_seconds)
           values ($1,$2,$3)`,
          [seoId, c.title, c.timestampSeconds],
        );
      }

      await client.query("commit");
      return seoId;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async list(tenant: TenantContext, projectId?: string) {
    const params: unknown[] = [tenant.organizationId];
    const where = [SeoRepository.TENANT_SCOPE];
    if (projectId) {
      params.push(projectId);
      where.push(`s.project_id = $${params.length}`);
    }
    const { rows } = await this.pool.query<SeoProjectRow>(
      `select ${SEO_COLUMNS} from public.seo_projects s
        where ${where.join(" and ")}
        order by s.created_at desc limit 50`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<SeoProjectRow>(
      `select ${SEO_COLUMNS} from public.seo_projects s
        where ${SeoRepository.TENANT_SCOPE} and s.id = $2`,
      [tenant.organizationId, id],
    );
    const head = rows[0];
    if (!head) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "SEO set not found" });
    }

    const [titles, descriptions, keywords, tags, hashtags, chapters] = await Promise.all([
      this.pool.query(
        `select id, title, seo_score, click_score, selected from public.seo_titles
          where seo_project_id = $1 order by seo_score desc nulls last, created_at`,
        [id],
      ),
      this.pool.query(
        `select id, description, seo_score, selected from public.seo_descriptions
          where seo_project_id = $1 order by seo_score desc nulls last, created_at`,
        [id],
      ),
      this.pool.query(
        `select id, keyword, intent, priority from public.seo_keywords
          where seo_project_id = $1 order by priority nulls last, created_at`,
        [id],
      ),
      this.pool.query(
        `select id, tag, selected from public.seo_tags where seo_project_id = $1 order by tag`,
        [id],
      ),
      this.pool.query(
        `select id, hashtag from public.seo_hashtags where seo_project_id = $1 order by hashtag`,
        [id],
      ),
      this.pool.query(
        `select id, title, timestamp_seconds from public.seo_chapters
          where seo_project_id = $1 order by timestamp_seconds`,
        [id],
      ),
    ]);

    return {
      ...head,
      titles: titles.rows,
      descriptions: descriptions.rows,
      keywords: keywords.rows,
      tags: tags.rows,
      hashtags: hashtags.rows,
      chapters: chapters.rows,
    };
  }

  /** Selecting is exclusive: exactly one title and one description win. */
  async select(tenant: TenantContext, id: string, titleId?: string, descriptionId?: string) {
    await this.findOne(tenant, id);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (titleId) {
        await client.query(
          `update public.seo_titles set selected = (id = $2) where seo_project_id = $1`,
          [id, titleId],
        );
      }
      if (descriptionId) {
        await client.query(
          `update public.seo_descriptions set selected = (id = $2) where seo_project_id = $1`,
          [id, descriptionId],
        );
      }
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
    return this.findOne(tenant, id);
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.seo_projects where id = $1`, [id]);
  }
}
