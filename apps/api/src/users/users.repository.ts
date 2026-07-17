import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import type { Profiles } from "@podmind/types";
import { PG_POOL } from "../database/database.module";

/**
 * Users repository — the only place profile SQL lives. Every query is
 * scoped by the authenticated user id (tenant safety at the primary layer;
 * RLS remains defense-in-depth).
 */
@Injectable()
export class UsersRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async findProfileById(userId: string): Promise<Profiles> {
    const { rows } = await this.pool.query<Profiles>(
      `select id, email, full_name, avatar_url, organization_id,
              created_at, updated_at
         from public.profiles
        where id = $1`,
      [userId],
    );
    const profile = rows[0];
    if (!profile) {
      throw new NotFoundException({ code: "PROFILE_NOT_FOUND", message: "Profile not found" });
    }
    return profile;
  }
}
