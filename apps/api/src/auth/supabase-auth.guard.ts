import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";
import type { Env } from "../config/env";

/** Route metadata: skip authentication (health checks, webhooks). */
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthUser {
  /** auth.users.id — the tenant key for every repository query. */
  id: string;
  email: string | null;
  claims: JWTPayload;
}

export type AuthedRequest = Request & { user?: AuthUser; id?: string };

/** `@CurrentUser()` — injects the verified AuthUser into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) throw new UnauthorizedException("Missing authenticated user");
    return req.user;
  },
);

/**
 * Global auth guard — verifies Supabase-issued JWTs (asymmetric, via the
 * project JWKS endpoint). jose caches and re-fetches the key set on
 * rotation. Tests inject a local JWKS through `setKeyResolver`.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private keyResolver: JWTVerifyGetKey | null = null;

  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Test seam: override JWKS resolution (never used in production paths). */
  setKeyResolver(resolver: JWTVerifyGetKey): void {
    this.keyResolver = resolver;
  }

  private resolver(): JWTVerifyGetKey {
    if (this.keyResolver) return this.keyResolver;
    const supabaseUrl = this.config.get("SUPABASE_URL", { infer: true });
    if (!supabaseUrl) {
      throw new UnauthorizedException(
        "Authentication is not configured (SUPABASE_URL missing)",
      );
    }
    this.keyResolver = createRemoteJWKSet(
      new URL(`${supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
    return this.keyResolver;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = header.slice("Bearer ".length);

    try {
      const { payload } = await jwtVerify(token, this.resolver(), {
        audience: this.config.get("SUPABASE_JWT_AUD", { infer: true }),
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new UnauthorizedException("Token missing subject");
      }
      request.user = {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : null,
        claims: payload,
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
