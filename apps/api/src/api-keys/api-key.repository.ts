import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { createHash, randomBytes } from "node:crypto";
import { PG_POOL } from "../database/database.module";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { CreateApiKeyDto } from "./dto/api-key.dto";

/**
 * API key storage.
 *
 * The secret is generated once, hashed with SHA-256, and only the hash is
 * stored — the plaintext is returned to the caller exactly once and is not
 * recoverable afterwards. A stolen database therefore yields no usable keys.
 * The prefix is stored separately so the UI can identify a key without
 * holding the secret.
 */
@Injectable()
export class ApiKeyRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  static hash(secret: string): string {
    return createHash("sha256").update(secret).digest("hex");
  }

  async create(tenant: TenantContext, dto: CreateApiKeyDto) {
    // 32 random bytes, base64url — no ambiguity between similar characters.
    const secret = `pmk_${randomBytes(32).toString("base64url")}`;
    const prefix = secret.slice(0, 12);

    const expiresAt = dto.expires_in_days
      ? new Date(Date.now() + dto.expires_in_days * 86_400_000).toISOString()
      : null;

    const { rows } = await this.pool.query(
      `insert into public.api_keys
         (organization_id, created_by, name, key_prefix, hashed_key,
          permissions, rate_limit_per_minute, expires_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
       returning id, name, key_prefix, permissions, rate_limit_per_minute,
                 expires_at, last_used_at, is_active, created_at`,
      [
        tenant.organizationId,
        tenant.userId,
        dto.name,
        prefix,
        ApiKeyRepository.hash(secret),
        JSON.stringify(dto.permissions ?? []),
        dto.rate_limit_per_minute ?? 60,
        expiresAt,
      ],
    );

    // The only time the plaintext ever leaves this method.
    return { ...rows[0]!, secret };
  }

  async list(tenant: TenantContext) {
    const { rows } = await this.pool.query(
      `select id, name, key_prefix, permissions, rate_limit_per_minute,
              expires_at, last_used_at, is_active, created_at
         from public.api_keys
        where organization_id = $1
        order by created_at desc`,
      [tenant.organizationId],
    );
    return rows;
  }

  /** Revoking deactivates rather than deletes, so the audit trail survives. */
  async revoke(tenant: TenantContext, id: string) {
    const { rows } = await this.pool.query(
      `update public.api_keys set is_active = false, updated_at = now()
        where id = $1 and organization_id = $2
        returning id, name, key_prefix, is_active`,
      [id, tenant.organizationId],
    );
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "API key not found" });
    }
    return row;
  }

  async remove(tenant: TenantContext, id: string): Promise<void> {
    const { rowCount } = await this.pool.query(
      `delete from public.api_keys where id = $1 and organization_id = $2`,
      [id, tenant.organizationId],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "API key not found" });
    }
  }

  /**
   * Resolve a presented secret to its organization. Used by the future public
   * API guard; returns null for unknown, inactive or expired keys.
   */
  async verify(secret: string) {
    const { rows } = await this.pool.query(
      `update public.api_keys
          set last_used_at = now()
        where hashed_key = $1
          and is_active = true
          and (expires_at is null or expires_at > now())
        returning id, organization_id, permissions, rate_limit_per_minute`,
      [ApiKeyRepository.hash(secret)],
    );
    return rows[0] ?? null;
  }
}
