import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import type { AuthUser } from "../auth/supabase-auth.guard";

/**
 * Gate for the admin surface.
 *
 * Everything behind this guard reads across every organization on the
 * platform, so it is the one place where the tenant scoping that protects
 * every other module is deliberately absent. Membership is therefore checked
 * against admin_users on each request rather than trusted from a JWT claim: a
 * token issued before an admin was removed must stop working immediately, and
 * claims are only as fresh as the last token refresh.
 *
 * Denials are logged with the user id — an unauthorised attempt to reach the
 * admin API is worth knowing about.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const { rows } = await this.pool.query<{ is_super_admin: boolean; role: string }>(
      `select is_super_admin, role from public.admin_users
        where user_id = $1 and is_active = true`,
      [user.id],
    );

    if (rows.length === 0) {
      this.logger.warn({ userId: user.id }, "denied admin access");
      throw new ForbiddenException({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return true;
  }
}
