import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { CreateMemoryDto, ListMemoryQueryDto, UpdateMemoryDto } from "./dto/memory.dto";

const COLUMNS = `id, user_id, project_id, conversation_id, memory_type::text as memory_type,
                 title, content, importance, confidence, source, expires_at,
                 last_accessed_at, access_count, metadata, created_at, updated_at`;

/**
 * Memory repository.
 *
 * Memories belong to a user, not an organization: they encode how *this*
 * person wants their show written, so they must not leak across accounts even
 * inside a shared workspace. Every statement is therefore scoped by user_id.
 */
@Injectable()
export class MemoryRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** A project reference is only accepted if the caller's tenant owns it. */
  private async assertProject(tenant: TenantContext, projectId: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `select 1 from public.projects p
        where p.id = $2 and p.workspace_id in (
          select w.id from public.workspaces w where w.organization_id = $1
        )`,
      [tenant.organizationId, projectId],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Project not found" });
    }
  }

  async create(tenant: TenantContext, dto: CreateMemoryDto) {
    if (dto.project_id) await this.assertProject(tenant, dto.project_id);

    const { rows } = await this.pool.query(
      `insert into public.ai_memories
         (user_id, project_id, memory_type, title, content, importance, source)
       values ($1,$2,$3::memory_type,$4,$5,$6,'user')
       returning ${COLUMNS}`,
      [
        tenant.userId,
        dto.project_id ?? null,
        dto.memory_type,
        dto.title,
        dto.content,
        dto.importance ?? 5,
      ],
    );
    return rows[0]!;
  }

  async list(tenant: TenantContext, query: ListMemoryQueryDto) {
    const params: unknown[] = [tenant.userId];
    const where = ["m.user_id = $1"];

    if (!query.include_expired) {
      where.push("(m.expires_at is null or m.expires_at > now())");
    }
    if (query.project_id) {
      params.push(query.project_id);
      where.push(`m.project_id = $${params.length}`);
    }
    if (query.memory_type) {
      params.push(query.memory_type);
      where.push(`m.memory_type = $${params.length}::memory_type`);
    }
    if (query.search) {
      params.push(`%${query.search}%`);
      where.push(`(m.title ilike $${params.length} or m.content ilike $${params.length})`);
    }

    const { rows } = await this.pool.query(
      `select ${COLUMNS.split(",").map((c) => `m.${c.trim()}`).join(", ")}
         from public.ai_memories m
        where ${where.join(" and ")}
        order by m.importance desc, m.created_at desc
        limit 200`,
      params,
    );
    return rows;
  }

  async findOne(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query(
      `select ${COLUMNS} from public.ai_memories where id = $1 and user_id = $2`,
      [id, tenant.userId],
    );
    const memory = rows[0];
    if (!memory) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Memory not found" });
    }
    return memory;
  }

  async update(tenant: TenantContext, id: string, dto: UpdateMemoryDto) {
    await this.findOne(tenant, id);

    const sets: string[] = [];
    const params: unknown[] = [id, tenant.userId];

    for (const field of ["title", "content", "importance"] as const) {
      if (dto[field] !== undefined) {
        params.push(dto[field]);
        sets.push(`${field} = $${params.length}`);
      }
    }
    if (dto.memory_type !== undefined) {
      params.push(dto.memory_type);
      sets.push(`memory_type = $${params.length}::memory_type`);
    }
    if (sets.length === 0) return this.findOne(tenant, id);

    const { rows } = await this.pool.query(
      `update public.ai_memories set ${sets.join(", ")}, updated_at = now()
        where id = $1 and user_id = $2 returning ${COLUMNS}`,
      params,
    );
    return rows[0]!;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    await this.findOne(tenant, id);
    await this.pool.query(`delete from public.ai_memories where id = $1 and user_id = $2`, [
      id,
      tenant.userId,
    ]);
  }

  /** Counts by type, for the header summary. */
  async stats(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select memory_type::text as memory_type, count(*)::int as count
         from public.ai_memories
        where user_id = $1 and (expires_at is null or expires_at > now())
        group by memory_type order by count desc`,
      [tenant.userId],
    );
    const total = rows.reduce((sum: number, r: { count: number }) => sum + r.count, 0);
    return { total, by_type: rows };
  }
}
