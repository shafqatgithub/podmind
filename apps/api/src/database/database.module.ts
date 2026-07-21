import { Global, Module, type OnApplicationShutdown, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import type { Env } from "../config/env";

export const PG_POOL = "PG_POOL";

/**
 * Global database module — one pg.Pool for the process lifetime.
 * Repositories (later stages) inject PG_POOL; SQL never leaves that layer.
 * SSL is required for Supabase's pooler (DB_SSL=true in production).
 */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new Pool({
          connectionString: config.get("DATABASE_URL", { infer: true }),
          max: config.get("DB_POOL_MAX", { infer: true }),
          ssl: config.get("DB_SSL", { infer: true }) ? { rejectUnauthorized: false } : undefined,
          statement_timeout: 60_000,
          // pgvector installs its type into `extensions` on Supabase, and a
          // role's default search_path may not include it — in which case
          // `::vector` casts fail only in production, on the first document
          // ingested. Pinning the path here makes the type resolve the same
          // way everywhere.
          options: "-c search_path=public,extensions",
        }),
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
