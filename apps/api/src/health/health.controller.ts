import { Controller, Get, Inject } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { Public } from "../auth/supabase-auth.guard";
import type { Env } from "../config/env";

/**
 * Liveness (/api/v1/health) — process is up, no dependencies.
 * Readiness (/api/v1/health/ready) — database answers SELECT 1.
 */
/** Process start time, so a restart is visible in the health payload. */
const STARTED_AT = new Date().toISOString();

@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get()
  liveness() {
    const sha = this.config.get("RAILWAY_GIT_COMMIT_SHA", { infer: true });
    return {
      status: "ok",
      // Which build is actually running. Platforms can redeploy an older
      // successful image or skip a commit entirely, and without this the
      // only way to tell is to probe for routes that may not exist yet.
      commit: sha ? sha.slice(0, 7) : "unknown",
      started_at: STARTED_AT,
    };
  }

  @Get("ready")
  @HealthCheck()
  readiness() {
    return this.health.check([
      async () => {
        const check = this.indicator.check("database");
        try {
          await this.pool.query("select 1");
          return check.up();
        } catch (err) {
          return check.down({ message: err instanceof Error ? err.message : "unreachable" });
        }
      },
    ]);
  }
}
