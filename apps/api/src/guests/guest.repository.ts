import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { ListGuestsQueryDto } from "./dto/guest.dto";

export interface GuestRow {
  id: string;
  project_id: string;
  full_name: string;
  slug: string | null;
  headline: string | null;
  biography: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  country: string | null;
  website_url: string | null;
  email: string | null;
  image_url: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const GUEST_COLUMNS = `g.id, g.project_id, g.full_name, g.slug::text as slug, g.headline,
                       g.biography, g.company, g.job_title, g.industry, g.country,
                       g.website_url, g.email, g.image_url, g.metadata,
                       g.created_at, g.updated_at`;

/** Social platforms the schema accepts; anything else is dropped. */
const SOCIAL_PLATFORMS = new Set([
  "linkedin",
  "x",
  "facebook",
  "instagram",
  "threads",
  "youtube",
  "newsletter",
]);

export interface GuestBriefingInput {
  companies: {
    company_name: string;
    role: string | null;
    start_date: string | null;
    end_date: string | null;
    is_current: boolean;
    description: string | null;
  }[];
  books: {
    title: string;
    publisher: string | null;
    published_date: string | null;
    description: string | null;
  }[];
  interviews: {
    platform: string | null;
    interview_title: string | null;
    interview_url: string | null;
    interview_date: string | null;
    summary: string | null;
  }[];
  social: { platform: string; username: string | null; profile_url: string | null }[];
  questions: { question: string; question_type: string; difficulty: string }[];
  tags: string[];
}

@Injectable()
export class GuestRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Guests reachable by this organization, via project -> workspace. */
  private static readonly TENANT_SCOPE = `
    g.project_id in (
      select p.id from public.projects p
       where p.workspace_id in (
         select w.id from public.workspaces w where w.organization_id = $1
       )
    )`;

  async assertProjectInTenant(
    tenant: TenantContext,
    projectId: string,
  ): Promise<{
    id: string;
    podcast_name: string | null;
    audience: string | null;
    niche: string | null;
    language: string;
  }> {
    const { rows } = await this.pool.query(
      `select p.id, p.podcast_name, p.audience, p.niche, p.language::text as language
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
      podcast_name: string | null;
      audience: string | null;
      niche: string | null;
      language: string;
    };
  }

  /**
   * Persist a guest and every related record in one transaction, so a guest
   * is never left with half a briefing attached.
   */
  async saveBriefing(
    tenant: TenantContext,
    guest: {
      projectId: string;
      fullName: string;
      headline: string | null;
      biography: string | null;
      company: string | null;
      jobTitle: string | null;
      industry: string | null;
      country: string | null;
      metadata: Record<string, unknown>;
    },
    related: GuestBriefingInput,
  ): Promise<GuestRow> {
    const client: PoolClient = await this.pool.connect();
    try {
      await client.query("begin");

      const { rows } = await client.query<GuestRow>(
        `insert into public.guests
           (project_id, created_by, full_name, headline, biography, company,
            job_title, industry, country, metadata)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         returning id, project_id, full_name, slug::text as slug, headline, biography,
                   company, job_title, industry, country, website_url, email,
                   image_url, metadata, created_at, updated_at`,
        [
          guest.projectId,
          tenant.userId,
          guest.fullName,
          guest.headline,
          guest.biography,
          guest.company,
          guest.jobTitle,
          guest.industry,
          guest.country,
          JSON.stringify(guest.metadata),
        ],
      );
      const saved = rows[0]!;

      for (const c of related.companies) {
        await client.query(
          `insert into public.guest_companies
             (guest_id, company_name, role, start_date, end_date, is_current, description)
           values ($1,$2,$3,$4::date,$5::date,$6,$7)`,
          [saved.id, c.company_name, c.role, c.start_date, c.end_date, c.is_current, c.description],
        );
      }

      for (const b of related.books) {
        await client.query(
          `insert into public.guest_books (guest_id, title, publisher, published_date, description)
           values ($1,$2,$3,$4::date,$5)`,
          [saved.id, b.title, b.publisher, b.published_date, b.description],
        );
      }

      for (const i of related.interviews) {
        await client.query(
          `insert into public.guest_interviews
             (guest_id, platform, interview_title, interview_url, interview_date, summary)
           values ($1,$2,$3,$4,$5::date,$6)`,
          [
            saved.id,
            i.platform,
            i.interview_title,
            i.interview_url,
            i.interview_date,
            i.summary,
          ],
        );
      }

      for (const s of related.social) {
        if (!SOCIAL_PLATFORMS.has(s.platform)) continue;
        await client.query(
          `insert into public.guest_social_profiles (guest_id, platform, username, profile_url)
           values ($1,$2::social_platform,$3,$4)`,
          [saved.id, s.platform, s.username, s.profile_url],
        );
      }

      for (const q of related.questions) {
        await client.query(
          `insert into public.guest_questions
             (guest_id, question, question_type, difficulty, ai_generated)
           values ($1,$2,$3,$4,true)`,
          [saved.id, q.question, q.question_type, q.difficulty],
        );
      }

      for (const tag of related.tags) {
        await client.query(
          `insert into public.guest_tags (guest_id, tag) values ($1,$2)`,
          [saved.id, tag],
        );
      }

      await client.query("commit");
      return saved;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async createManual(
    tenant: TenantContext,
    input: {
      projectId: string;
      fullName: string;
      headline?: string | null;
      company?: string | null;
      jobTitle?: string | null;
      email?: string | null;
      websiteUrl?: string | null;
    },
  ): Promise<GuestRow> {
    const { rows } = await this.pool.query<GuestRow>(
      `insert into public.guests
         (project_id, created_by, full_name, headline, company, job_title, email, website_url)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       returning id, project_id, full_name, slug::text as slug, headline, biography,
                 company, job_title, industry, country, website_url, email,
                 image_url, metadata, created_at, updated_at`,
      [
        input.projectId,
        tenant.userId,
        input.fullName,
        input.headline ?? null,
        input.company ?? null,
        input.jobTitle ?? null,
        input.email ?? null,
        input.websiteUrl ?? null,
      ],
    );
    return rows[0]!;
  }

  async list(tenant: TenantContext, query: ListGuestsQueryDto): Promise<GuestRow[]> {
    const params: unknown[] = [tenant.organizationId];
    const where = [GuestRepository.TENANT_SCOPE, `g.status <> 'deleted'::record_status`];

    if (query.project_id) {
      params.push(query.project_id);
      where.push(`g.project_id = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(
        `(g.full_name ilike $${params.length} or g.company ilike $${params.length} or g.headline ilike $${params.length})`,
      );
    }
    params.push(query.limit ?? 50);

    const { rows } = await this.pool.query<GuestRow>(
      `select ${GUEST_COLUMNS} from public.guests g
        where ${where.join(" and ")}
        order by g.created_at desc
        limit $${params.length}`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query<GuestRow>(
      `select ${GUEST_COLUMNS} from public.guests g
        where ${GuestRepository.TENANT_SCOPE} and g.id = $2
          and g.status <> 'deleted'::record_status`,
      [tenant.organizationId, id],
    );
    const guest = rows[0];
    if (!guest) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Guest not found" });
    }

    const [companies, books, interviews, social, questions, tags, notes] = await Promise.all([
      this.pool.query(
        `select id, company_name, role, start_date, end_date, is_current, description
           from public.guest_companies where guest_id = $1
          order by is_current desc, start_date desc nulls last`,
        [id],
      ),
      this.pool.query(
        `select id, title, publisher, published_date, description
           from public.guest_books where guest_id = $1 order by published_date desc nulls last`,
        [id],
      ),
      this.pool.query(
        `select id, platform, interview_title, interview_url, interview_date, summary
           from public.guest_interviews where guest_id = $1
          order by interview_date desc nulls last`,
        [id],
      ),
      this.pool.query(
        `select id, platform::text as platform, username, profile_url, followers, verified
           from public.guest_social_profiles where guest_id = $1 order by platform`,
        [id],
      ),
      this.pool.query(
        `select id, question, question_type, difficulty, ai_generated
           from public.guest_questions where guest_id = $1 order by created_at`,
        [id],
      ),
      this.pool.query(`select id, tag from public.guest_tags where guest_id = $1 order by tag`, [
        id,
      ]),
      this.pool.query(
        `select id, note, created_at from public.guest_notes where guest_id = $1
          order by created_at desc`,
        [id],
      ),
    ]);

    return {
      ...guest,
      companies: companies.rows,
      books: books.rows,
      interviews: interviews.rows,
      social_profiles: social.rows,
      questions: questions.rows,
      tags: tags.rows.map((t: { tag: string }) => t.tag),
      notes: notes.rows,
    };
  }

  async addNote(tenant: TenantContext, guestId: string, note: string) {
    await this.findOne(tenant, guestId);
    const { rows } = await this.pool.query(
      `insert into public.guest_notes (guest_id, user_id, note)
       values ($1,$2,$3) returning id, note, created_at`,
      [guestId, tenant.userId, note],
    );
    return rows[0]!;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(
      `update public.guests set status = 'deleted'::record_status, updated_at = now()
        where id = $1`,
      [id],
    );
  }
}
