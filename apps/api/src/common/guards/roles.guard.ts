import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenancyService, type OrganizationRole } from "../../tenancy/tenancy.service";
import { IS_PUBLIC_KEY, type AuthedRequest } from "../../auth/supabase-auth.guard";

/**
 * Role enforcement.
 *
 * Roles were being stored and displayed but never checked, so a viewer could
 * do everything an owner could — the setting was decoration. This turns it
 * into a rule, and does it centrally rather than per controller: a permission
 * that has to be remembered in forty places is one that will be forgotten in
 * one of them, and that one is the hole.
 *
 * The rule is deliberately coarse — reading versus changing — because that is
 * the distinction the roles actually promise and the only one that can be
 * enforced without knowing what each endpoint touches. Finer rules (a member
 * editing only their own work) need per-record ownership and belong with the
 * repositories that load those records.
 */

/** Routes that write but must stay open to every role. */
export const ALLOW_ANY_ROLE_KEY = "allowAnyRole";
export const AllowAnyRole = () => SetMetadata(ALLOW_ANY_ROLE_KEY, true);

/** Roles that may change anything. Everyone else reads. */
const CAN_WRITE: OrganizationRole[] = ["owner", "admin", "manager", "member"];

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Paths a viewer may still POST to.
 *
 * A read-only role that cannot accept an invitation, change their own
 * password or leave the organization is not read-only, it is stuck. These
 * are the actions that belong to the person rather than to the organization's
 * content.
 */
const PERSONAL_PATHS = [
  "/organization/invitations/accept",
  "/organization/invitations/preview",
  "/settings/profile",
  "/settings/preferences",
  "/notifications",
];

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenancy: TenancyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const method = request.method.toUpperCase();

    // Reading is open to every role, which is most requests — checked first
    // so the common path costs nothing.
    if (READ_METHODS.has(method)) return true;

    const allowAnyRole = this.reflector.getAllAndOverride<boolean>(ALLOW_ANY_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowAnyRole) return true;

    const path = request.originalUrl ?? request.url ?? "";
    if (PERSONAL_PATHS.some((personal) => path.includes(personal))) return true;

    const userId = request.user?.id;
    // No user means the auth guard will reject this anyway; not this guard's
    // job to decide, and guessing here would mask that failure.
    if (!userId) return true;

    const tenant = await this.tenancy.resolve(userId);
    if (CAN_WRITE.includes(tenant.role)) return true;

    this.logger.warn({ user: userId, role: tenant.role, method, path }, "write blocked by role");
    throw new ForbiddenException({
      code: "READ_ONLY_ROLE",
      message:
        "Your role in this organization is view-only. Ask an owner or admin to change it if you need to make changes.",
      details: { role: tenant.role },
    });
  }
}
