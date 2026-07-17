import { Controller, Get, Inject } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from "@nestjs/terminus";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";

/**
 * Liveness (/api/v1/health) — process is up, no dependencies.
 * Readiness (/api/v1/health/ready) — database answers SELECT 1.
 */
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Get()
  liveness() {
    return { status: "ok" };
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
