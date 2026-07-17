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
