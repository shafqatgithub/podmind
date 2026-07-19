import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type {
  CreateProjectDto,
  ListProjectsQueryDto,
  UpdateProjectDto,
} from "./dto/project.dto";

export interface ProjectRow {
  id: string;
  workspace_id: string;
  owner_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  status: string;
  visibility: string;
  language: string;
  category: string | null;
  niche: string | null;
  audience: string | null;
  podcast_name: string | null;
  color: string | null;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Columns returned to clients — no internal metadata leaks. */
const COLUMNS = `id, workspace_id, owner_id, title, slug, description,
                 status::text as status, visibility::text as visibility,
                 language::text as language, category, niche, audience,
                 podcast_name, color, is_favorite, is_archived,
                 created_at, updated_at`;

/**
 * Projects repository — the only place project SQL lives.
 *
 * Tenant safety: every statement is constrained to workspaces belonging to
 * the caller's organization, so a forged id from another tenant simply
 * matches no row (404, never another tenant's data). RLS remains as
 * defense-in-depth beneath this.
 */
@Injectable()
export class ProjectsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Guard clause reused by every query: workspace must be in the org. */
  private static readonly TENANT_SCOPE = `
    p.workspace_id in (
      select w.id from public.workspaces w where w.organization_id = $1
    )`;

  async create(tenant: TenantContext, dto: CreateProjectDto): Promise<ProjectRow> {
    const { rows } = await this.pool.query<ProjectRow>(
      `insert into public.projects
         (workspace_id, owner_id, title, slug, description, status, visibility,
          language, category, niche, audience, podcast_name, color)
       values ($1, $2, $3, $4, $5,
               coalesce($6::project_status, 'draft'),
               coalesce($7::project_visibility, 'workspace'),
               coalesce($8::language_code, 'en'),
               $9, $10, $11, $12, $13)
       returning ${COLUMNS}`,
      [
        tenant.workspaceId,
        tenant.userId,
        dto.title,
        await this.uniqueSlug(dto.title),
        dto.description ?? null,
        dto.status ?? null,
        dto.visibility ?? null,
        dto.language ?? null,
        dto.category ?? null,
        dto.niche ?? null,
        dto.audience ?? null,
        dto.podcast_name ?? null,
        dto.color ?? null,
      ],
    );
    return rows[0]!;
  }

  async findById(tenant: TenantContext, id: string): Promise<ProjectRow> {
    const { rows } = await this.pool.query<ProjectRow>(
      `select ${COLUMNS} from public.projects p
        where p.id = $2 and ${ProjectsRepository.TENANT_SCOPE}`,
      [tenant.organizationId, id],
    );
    const project = rows[0];
    if (!project) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return project;
  }

  /**
   * Keyset pagination on (created_at, id) — stable under concurrent inserts
   * and free of OFFSET scans as the table grows.
   */
  async list(
    tenant: TenantContext,
    query: ListProjectsQueryDto,
  ): Promise<{ items: ProjectRow[]; nextCursor: string | null; hasMore: boolean }> {
    const limit = query.limit ?? 20;
    const params: unknown[] = [tenant.organizationId];
    const where: string[] = [ProjectsRepository.TENANT_SCOPE];

    if (!query.include_archived) where.push(`p.is_archived = false`);
    if (query.favorites_only) where.push(`p.is_favorite = true`);
    if (query.status) {
      params.push(query.status);
      where.push(`p.status = $${params.length}::project_status`);
    }
    if (query.workspace_id) {
      params.push(query.workspace_id);
      where.push(`p.workspace_id = $${params.length}`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`(p.title ilike $${params.length} or p.description ilike $${params.length})`);
    }
    if (query.cursor) {
      const { createdAt, id } = decodeCursor(query.cursor);
      params.push(createdAt, id);
      where.push(`(p.created_at, p.id) < ($${params.length - 1}, $${params.length})`);
    }

    params.push(limit + 1);
    const { rows } = await this.pool.query<ProjectRow>(
      `select ${COLUMNS} from public.projects p
        where ${where.join(" and ")}
        order by p.created_at desc, p.id desc
        limit $${params.length}`,
      params,
    );

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      hasMore,
      nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    };
  }

  async update(tenant: TenantContext, id: string, dto: UpdateProjectDto): Promise<ProjectRow> {
    const sets: string[] = [];
    const params: unknown[] = [tenant.organizationId, id];

    const push = (column: string, value: unknown, cast = "") => {
      params.push(value);
      sets.push(`${column} = $${params.length}${cast}`);
    };

    if (dto.title !== undefined) push("title", dto.title);
    if (dto.description !== undefined) push("description", dto.description);
    if (dto.status !== undefined) push("status", dto.status, "::project_status");
    if (dto.visibility !== undefined) push("visibility", dto.visibility, "::project_visibility");
    if (dto.language !== undefined) push("language", dto.language, "::language_code");
    if (dto.category !== undefined) push("category", dto.category);
    if (dto.niche !== undefined) push("niche", dto.niche);
    if (dto.audience !== undefined) push("audience", dto.audience);
    if (dto.podcast_name !== undefined) push("podcast_name", dto.podcast_name);
    if (dto.color !== undefined) push("color", dto.color);
    if (dto.is_favorite !== undefined) push("is_favorite", dto.is_favorite);
    if (dto.is_archived !== undefined) push("is_archived", dto.is_archived);

    if (!sets.length) return this.findById(tenant, id);

    const { rows } = await this.pool.query<ProjectRow>(
      `update public.projects p
          set ${sets.join(", ")}, updated_at = now()
        where p.id = $2 and ${ProjectsRepository.TENANT_SCOPE}
      returning ${COLUMNS}`,
      params,
    );
    const project = rows[0];
    if (!project) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
    return project;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `delete from public.projects p
        where p.id = $2 and ${ProjectsRepository.TENANT_SCOPE}`,
      [tenant.organizationId, id],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
  }

  /** Dashboard counters in one round trip. */
  async stats(tenant: TenantContext): Promise<{
    total: number;
    active: number;
    archived: number;
    favorites: number;
  }> {
    const { rows } = await this.pool.query<{
      total: string;
      active: string;
      archived: string;
      favorites: string;
    }>(
      `select count(*)                                        as total,
              count(*) filter (where p.is_archived = false)   as active,
              count(*) filter (where p.is_archived = true)    as archived,
              count(*) filter (where p.is_favorite = true)    as favorites
         from public.projects p
        where ${ProjectsRepository.TENANT_SCOPE}`,
      [tenant.organizationId],
    );
    const r = rows[0]!;
    return {
      total: Number(r.total),
      active: Number(r.active),
      archived: Number(r.archived),
      favorites: Number(r.favorites),
    };
  }

  private async uniqueSlug(title: string): Promise<string> {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "project";
    // Slug is unique per table in the documented schema; suffix on collision.
    const { rows } = await this.pool.query<{ count: string }>(
      `select count(*) from public.projects where slug = $1 or slug like $2`,
      [base, `${base}-%`],
    );
    const taken = Number(rows[0]?.count ?? 0);
    return taken === 0 ? base : `${base}-${taken + 1}`;
  }
}

/* ------------------------------------------------------------- cursors */

export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt, id })).toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: string; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString()) as {
      t: string;
      id: string;
    };
    if (!parsed.t || !parsed.id) throw new Error("incomplete cursor");
    return { createdAt: parsed.t, id: parsed.id };
  } catch {
    throw new NotFoundException({ code: "INVALID_CURSOR", message: "Invalid pagination cursor" });
  }
}
