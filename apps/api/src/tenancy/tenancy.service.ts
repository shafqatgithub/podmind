import { Inject, Injectable, Logger } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { PG_POOL } from "../database/database.module";

/** Everything a request needs to act on behalf of a user's tenant. */
export interface TenantContext {
  userId: string;
  organizationId: string;
  workspaceId: string;
  /**
   * The caller's role in this organization.
   *
   * Carried here rather than looked up per check: every request already
   * resolves its tenant, and a permission that costs an extra query is a
   * permission people are tempted to skip.
   */
  role: OrganizationRole;
}

export const ORGANIZATION_ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Credits granted with the free plan on provisioning. */
/**
 * Must match the Free plan's ai_credits in subscription_plans. These drifted
 * once — the plan advertised 5,000 while provisioning granted 500 — which
 * would have made the pricing page a promise the product broke on signup.
 */
const FREE_PLAN_CREDITS = 150;

/**
 * Tenancy provisioning.
 *
 * The signup trigger creates `profiles`, but the documented schema requires
 * an organization and a workspace before any project can exist. This service
 * closes that gap: the first authenticated request provisions the full tenant
 * (organization → membership → default workspace → membership → AI credit
 * balance) inside one transaction, then caches the context on the profile.
 *
 * Idempotent by design — concurrent first requests converge on one tenant.
 */
@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Resolve the caller's tenant, provisioning it on first use. */
  async resolve(userId: string): Promise<TenantContext> {
    const existing = await this.lookup(userId);
    if (existing) return existing;
    return this.provision(userId);
  }

  /**
   * The organization this user works in.
   *
   * Membership, not ownership. Looking only at `owner_id` meant an invited
   * teammate never landed in the organization that invited them — they were
   * provisioned a private one instead, with their own free credits and none
   * of the shared work. The invitation appeared to succeed and changed
   * nothing they could see.
   *
   * Where someone belongs to several, the one they own wins, then the oldest
   * membership: a founder who has also been invited elsewhere should still
   * open their own studio by default.
   */
  private async lookup(userId: string): Promise<TenantContext | null> {
    const { rows } = await this.pool.query<{
      organization_id: string;
      workspace_id: string;
      role: OrganizationRole;
    }>(
      `select o.id as organization_id, w.id as workspace_id, m.role::text as role
         from public.organization_members m
         join public.organizations o on o.id = m.organization_id and o.is_active = true
         join public.workspaces w
           on w.organization_id = o.id and w.is_default = true
        where m.user_id = $1 and m.is_active
        order by (o.owner_id = $1) desc, m.joined_at
        limit 1`,
      [userId],
    );
    const row = rows[0];
    return row
      ? {
          userId,
          organizationId: row.organization_id,
          workspaceId: row.workspace_id,
          role: row.role,
        }
      : null;
  }

  private async provision(userId: string): Promise<TenantContext> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      // Serialize concurrent first requests for this user.
      const { rows: profileRows } = await client.query<{ email: string; full_name: string | null }>(
        `select email, full_name from public.profiles where id = $1 for update`,
        [userId],
      );
      const profile = profileRows[0];
      if (!profile) {
        throw new Error(`Cannot provision tenant: profile ${userId} not found`);
      }

      // Another request may have provisioned while we waited for the lock —
      // or the user may have joined an organization by invitation, in which
      // case they already have somewhere to work and must not be given a
      // second, private one.
      const { rows: raced } = await client.query<{
        organization_id: string;
        workspace_id: string;
        role: OrganizationRole;
      }>(
        `select o.id as organization_id, w.id as workspace_id, m.role::text as role
           from public.organization_members m
           join public.organizations o on o.id = m.organization_id and o.is_active = true
           join public.workspaces w on w.organization_id = o.id and w.is_default = true
          where m.user_id = $1 and m.is_active
          order by (o.owner_id = $1) desc, m.joined_at
          limit 1`,
        [userId],
      );
      if (raced[0]) {
        await client.query("commit");
        return {
          userId,
          organizationId: raced[0].organization_id,
          workspaceId: raced[0].workspace_id,
          role: raced[0].role,
        };
      }

      const displayName = profile.full_name?.trim() || profile.email.split("@")[0] || "My";
      const orgName = `${displayName}'s Studio`;
      const slug = await this.uniqueSlug(client, "organizations", displayName);

      const { rows: orgRows } = await client.query<{ id: string }>(
        `insert into public.organizations (name, slug, owner_id, subscription_plan)
         values ($1, $2, $3, 'free')
         returning id`,
        [orgName, slug, userId],
      );
      const organizationId = orgRows[0]!.id;

      await client.query(
        `insert into public.organization_members (organization_id, user_id, role)
         values ($1, $2, 'owner')`,
        [organizationId, userId],
      );

      const { rows: wsRows } = await client.query<{ id: string }>(
        `insert into public.workspaces
             (organization_id, name, slug, owner_id, is_default, visibility)
         values ($1, 'Default Workspace', $2, $3, true, 'workspace')
         returning id`,
        [organizationId, `${slug}-default`, userId],
      );
      const workspaceId = wsRows[0]!.id;

      await client.query(
        `insert into public.workspace_members (workspace_id, user_id, role)
         values ($1, $2, 'owner')`,
        [workspaceId, userId],
      );

      await client.query(
        `insert into public.ai_credit_balances
             (organization_id, available_credits, used_credits, purchased_credits)
         values ($1, $2, 0, 0)
         on conflict (organization_id) do nothing`,
        [organizationId, FREE_PLAN_CREDITS],
      );

      // Cache the active organization on the profile (RLS helpers read it).
      await client.query(`update public.profiles set organization_id = $2 where id = $1`, [
        userId,
        organizationId,
      ]);

      await client.query("commit");
      this.logger.log({ userId, organizationId, workspaceId }, "tenant provisioned");
      // Freshly provisioned: this person just created the organization.
      return { userId, organizationId, workspaceId, role: "owner" };
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  /** Slugify and disambiguate against existing rows. */
  private async uniqueSlug(client: PoolClient, table: string, source: string): Promise<string> {
    const base =
      source
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "studio";

    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const { rowCount } = await client.query(
        `select 1 from public.${table === "organizations" ? "organizations" : "workspaces"}
          where slug = $1`,
        [candidate],
      );
      if (!rowCount) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
