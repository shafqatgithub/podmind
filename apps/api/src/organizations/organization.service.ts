import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";
import { PG_POOL } from "../database/database.module";
import { EmailService } from "../email/email.service";
import type { TenantContext } from "../tenancy/tenancy.service";
import type { Env } from "../config/env";

/**
 * Inviting people into an organization.
 *
 * The invite link is a bearer credential, so it is bound to the address it
 * was sent to and re-checked on acceptance — a forwarded link must not let
 * someone else in. Only the hash is stored, it expires, and accepting
 * consumes it.
 *
 * Roles are hierarchical, and the check is "can this person grant that role"
 * rather than a flat allow-list: a manager who could invite an owner would
 * be able to promote themselves through a proxy.
 */

export const ORGANIZATION_ROLES = ["owner", "admin", "manager", "member", "viewer"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** Lower is more powerful. Used to compare two roles, never shown to users. */
const ROLE_RANK: Record<OrganizationRole, number> = {
  owner: 0,
  admin: 1,
  manager: 2,
  member: 3,
  viewer: 4,
};

/** Who may invite at all. */
const CAN_INVITE: OrganizationRole[] = ["owner", "admin"];

const INVITE_TTL_DAYS = 14;

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);
  private readonly appUrl: string;
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly email: EmailService,
    config: ConfigService<Env, true>,
  ) {
    this.appUrl = config.get("APP_URL", { infer: true }).replace(/\/$/, "");
    this.supabaseUrl = config.get("SUPABASE_URL", { infer: true }) ?? "";
    this.serviceRoleKey = config.get("SUPABASE_SERVICE_ROLE_KEY", { infer: true }) ?? "";
  }

  /** Members and pending invitations, for the settings page. */
  async listMembers(tenant: TenantContext) {
    const members = await this.pool.query(
      `select m.id, m.user_id, m.role::text as role, m.joined_at, m.is_active,
              p.email, p.full_name, p.avatar_url,
              (o.owner_id = m.user_id) as is_owner
         from public.organization_members m
         join public.profiles p on p.id = m.user_id
         join public.organizations o on o.id = m.organization_id
        where m.organization_id = $1
        order by case m.role::text
                   when 'owner' then 0 when 'admin' then 1 when 'manager' then 2
                   when 'member' then 3 else 4 end,
                 m.joined_at`,
      [tenant.organizationId],
    );

    const invitations = await this.pool.query(
      `select i.id, i.email, i.role::text as role, i.expires_at, i.created_at,
              p.full_name as invited_by_name
         from public.organization_invitations i
         join public.profiles p on p.id = i.invited_by
        where i.organization_id = $1
          and i.accepted_at is null and i.revoked_at is null
          and i.expires_at > now()
        order by i.created_at desc`,
      [tenant.organizationId],
    );

    return { members: members.rows, invitations: invitations.rows };
  }

  /**
   * Invite someone by email.
   *
   * Re-inviting an address replaces the previous link rather than adding a
   * second: two live invitations for one person is a way to be confused about
   * which one is real.
   */
  async invite(tenant: TenantContext, input: { email: string; role: OrganizationRole }) {
    const actor = await this.requireRole(tenant, CAN_INVITE);

    if (ROLE_RANK[input.role] < ROLE_RANK[actor]) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: `You can't invite someone as ${input.role} — that's above your own role.`,
      });
    }
    if (input.role === "owner") {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "An organization has one owner. Transfer ownership instead.",
      });
    }

    const email = input.email.trim().toLowerCase();

    const existing = await this.pool.query(
      `select 1 from public.organization_members m
         join public.profiles p on p.id = m.user_id
        where m.organization_id = $1 and lower(p.email) = $2`,
      [tenant.organizationId, email],
    );
    if (existing.rowCount) {
      throw new BadRequestException({
        code: "ALREADY_MEMBER",
        message: "That person is already in this organization.",
      });
    }

    // Supersede any earlier invitation to the same address.
    await this.pool.query(
      `update public.organization_invitations
          set revoked_at = now()
        where organization_id = $1 and lower(email) = $2
          and accepted_at is null and revoked_at is null`,
      [tenant.organizationId, email],
    );

    const token = randomBytes(32).toString("base64url");
    const { rows } = await this.pool.query<{ id: string; expires_at: string }>(
      `insert into public.organization_invitations
         (organization_id, email, role, token_hash, invited_by, expires_at)
       values ($1, $2, $3::organization_role, $4, $5, now() + make_interval(days => $6))
       returning id, expires_at`,
      [tenant.organizationId, email, input.role, hashToken(token), tenant.userId, INVITE_TTL_DAYS],
    );

    await this.sendInviteEmail(tenant, email, input.role, token);

    return {
      id: rows[0]!.id,
      email,
      role: input.role,
      expires_at: rows[0]!.expires_at,
      // Returned so the inviter can copy it — email delivery is not certain,
      // and a link they can paste into WhatsApp is often faster anyway.
      invite_url: this.inviteUrl(token),
    };
  }

  async revokeInvite(tenant: TenantContext, id: string) {
    await this.requireRole(tenant, CAN_INVITE);
    const { rowCount } = await this.pool.query(
      `update public.organization_invitations
          set revoked_at = now()
        where id = $1 and organization_id = $2 and accepted_at is null`,
      [id, tenant.organizationId],
    );
    if (!rowCount) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Invitation not found" });
    }
    return { revoked: true };
  }

  /** Change a member's role. */
  async updateRole(tenant: TenantContext, memberId: string, role: OrganizationRole) {
    const actor = await this.requireRole(tenant, CAN_INVITE);

    const { rows } = await this.pool.query<{ user_id: string; role: string; owner_id: string }>(
      `select m.user_id, m.role::text as role, o.owner_id
         from public.organization_members m
         join public.organizations o on o.id = m.organization_id
        where m.id = $1 and m.organization_id = $2`,
      [memberId, tenant.organizationId],
    );
    const member = rows[0];
    if (!member) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Member not found" });
    }
    if (member.user_id === member.owner_id) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "The owner's role can't be changed.",
      });
    }
    // Someone may not hand out authority above their own, nor demote a peer
    // who outranks them.
    if (
      ROLE_RANK[role] < ROLE_RANK[actor] ||
      ROLE_RANK[member.role as OrganizationRole] < ROLE_RANK[actor]
    ) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "That change is above your own role.",
      });
    }

    await this.pool.query(
      `update public.organization_members set role = $1::organization_role where id = $2`,
      [role, memberId],
    );
    return { updated: true };
  }

  async removeMember(tenant: TenantContext, memberId: string) {
    const actor = await this.requireRole(tenant, CAN_INVITE);

    const { rows } = await this.pool.query<{ user_id: string; role: string; owner_id: string }>(
      `select m.user_id, m.role::text as role, o.owner_id
         from public.organization_members m
         join public.organizations o on o.id = m.organization_id
        where m.id = $1 and m.organization_id = $2`,
      [memberId, tenant.organizationId],
    );
    const member = rows[0];
    if (!member) {
      throw new NotFoundException({ code: "NOT_FOUND", message: "Member not found" });
    }
    if (member.user_id === member.owner_id) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "The owner can't be removed. Transfer ownership first.",
      });
    }
    if (ROLE_RANK[member.role as OrganizationRole] < ROLE_RANK[actor]) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "That person outranks you.",
      });
    }

    await this.pool.query(`delete from public.organization_members where id = $1`, [memberId]);
    return { removed: true };
  }

  /** What an invite link points at, before anyone signs in. */
  async previewInvite(token: string) {
    const invite = await this.findInvite(token);
    const { rows } = await this.pool.query<{ name: string; inviter: string | null }>(
      `select o.name, p.full_name as inviter
         from public.organizations o
         join public.organization_invitations i on i.organization_id = o.id
         left join public.profiles p on p.id = i.invited_by
        where i.id = $1`,
      [invite.id],
    );
    return {
      organization: rows[0]?.name ?? "an organization",
      invited_by: rows[0]?.inviter ?? null,
      email: invite.email,
      role: invite.role,
    };
  }

  /**
   * Accept an invitation.
   *
   * The signed-in address must match the invited one. Without that check the
   * link would work for whoever opened it, which turns a private invitation
   * into a public door.
   */
  async acceptInvite(userId: string, userEmail: string, token: string) {
    const invite = await this.findInvite(token);

    if (invite.email.toLowerCase() !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenException({
        code: "WRONG_ACCOUNT",
        message: `This invitation was sent to ${invite.email}. Sign in with that address to accept it.`,
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(
        `insert into public.organization_members (organization_id, user_id, role, invited_by)
         values ($1, $2, $3::organization_role, $4)
         on conflict (organization_id, user_id) do update set role = excluded.role,
                                                              is_active = true`,
        [invite.organization_id, userId, invite.role, invite.invited_by],
      );
      await client.query(
        `update public.organization_invitations
            set accepted_at = now(), accepted_by = $2 where id = $1`,
        [invite.id, userId],
      );

      /**
       * Retire an untouched private studio.
       *
       * Signing up provisions everyone a studio of their own, so someone who
       * joins a team by invitation ends up owning an empty one as well —
       * complete with its own free credits, which is both confusing and a way
       * to mint credits by inviting yourself. If that studio has no work in
       * it, it is deactivated so the team's organization becomes the one they
       * open. A studio with anything in it is left alone: that is somebody's
       * work, and no invitation is worth losing it.
       */
      await client.query(
        `update public.organizations o
            set is_active = false
          where o.owner_id = $1
            and o.id <> $2
            and o.is_active
            and not exists (
              select 1 from public.workspaces w
               where w.organization_id = o.id
                 and exists (select 1 from public.projects p where p.workspace_id = w.id)
            )`,
        [userId, invite.organization_id],
      );

      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }

    this.logger.log({ organization: invite.organization_id, user: userId, role: invite.role });
    return { joined: true, organization_id: invite.organization_id, role: invite.role };
  }

  /**
   * Create an account straight from an invitation.
   *
   * The recipient already had to open a link that was emailed to them, which
   * is the same proof a verification code exists to obtain. Sending them
   * through a separate sign-up — retyping the address, waiting for a second
   * email, entering a code — asks for that proof twice and loses people in
   * between. So the account is created already confirmed, and the email is
   * taken from the invitation rather than from anything they type: a form
   * they could edit would let one person's link create another's account.
   */
  async registerFromInvite(token: string, password: string, fullName?: string) {
    const invite = await this.findInvite(token);

    if (password.length < 8) {
      throw new BadRequestException({
        code: "WEAK_PASSWORD",
        message: "Choose a password of at least 8 characters.",
      });
    }
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new BadRequestException({
        code: "SIGNUP_UNAVAILABLE",
        message: "Account creation isn't configured. Sign up separately and open this link again.",
      });
    }

    const response = await fetch(`${this.supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: this.serviceRoleKey,
        authorization: `Bearer ${this.serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: invite.email,
        password,
        // Confirmed on the strength of the invitation itself.
        email_confirm: true,
        user_metadata: fullName?.trim() ? { full_name: fullName.trim() } : {},
      }),
    });

    if (!response.ok) {
      const detail = (await response.json().catch(() => null)) as {
        msg?: string;
        message?: string;
        error_code?: string;
      } | null;
      const message = detail?.msg ?? detail?.message ?? "";

      // An address that already has an account is not an error worth a stack
      // trace — they simply need to sign in.
      if (response.status === 422 || /already/i.test(message)) {
        throw new BadRequestException({
          code: "ACCOUNT_EXISTS",
          message: `An account already exists for ${invite.email}. Sign in instead, then open this link again.`,
        });
      }

      this.logger.error({ status: response.status, message }, "invite signup failed");
      throw new BadRequestException({
        code: "SIGNUP_FAILED",
        message: message || "The account could not be created. Try again.",
      });
    }

    this.logger.log({ email: invite.email, organization: invite.organization_id });
    // Deliberately not accepted here: the client signs in with the password
    // it just set, then accepts, so membership is recorded against a real
    // session rather than trusted from an unauthenticated call.
    return { created: true, email: invite.email };
  }

  private async findInvite(token: string) {
    const { rows } = await this.pool.query<{
      id: string;
      organization_id: string;
      email: string;
      role: OrganizationRole;
      invited_by: string;
      expired: boolean;
      accepted_at: string | null;
      revoked_at: string | null;
    }>(
      `select id, organization_id, email, role::text as role, invited_by,
              (expires_at < now()) as expired, accepted_at, revoked_at
         from public.organization_invitations where token_hash = $1`,
      [hashToken(token)],
    );
    const invite = rows[0];
    if (!invite || invite.revoked_at) {
      throw new NotFoundException({
        code: "INVALID_INVITE",
        message: "This invitation is no longer valid. Ask for a new one.",
      });
    }
    if (invite.accepted_at) {
      throw new BadRequestException({
        code: "ALREADY_ACCEPTED",
        message: "This invitation has already been used.",
      });
    }
    if (invite.expired) {
      throw new BadRequestException({
        code: "EXPIRED_INVITE",
        message: "This invitation has expired. Ask for a new one.",
      });
    }
    return invite;
  }

  /** The caller's role, if it is one of the allowed ones. */
  private async requireRole(
    tenant: TenantContext,
    allowed: OrganizationRole[],
  ): Promise<OrganizationRole> {
    const { rows } = await this.pool.query<{ role: OrganizationRole }>(
      `select role::text as role from public.organization_members
        where organization_id = $1 and user_id = $2`,
      [tenant.organizationId, tenant.userId],
    );
    const role = rows[0]?.role;
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: "Only owners and admins can manage members.",
      });
    }
    return role;
  }

  private inviteUrl(token: string): string {
    return `${this.appUrl}/invite?token=${token}`;
  }

  private async sendInviteEmail(
    tenant: TenantContext,
    email: string,
    role: OrganizationRole,
    token: string,
  ): Promise<void> {
    const { rows } = await this.pool.query<{ name: string; inviter: string | null }>(
      `select o.name, p.full_name as inviter
         from public.organizations o, public.profiles p
        where o.id = $1 and p.id = $2`,
      [tenant.organizationId, tenant.userId],
    );
    const organization = rows[0]?.name ?? "PodMind AI";
    const inviter = rows[0]?.inviter;
    const url = this.inviteUrl(token);

    await this.email.send({
      to: email,
      subject: `${inviter ? `${inviter} invited you` : "You're invited"} to ${organization} on PodMind AI`,
      html: `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;border:1px solid #e6eaf2;">
      <tr><td align="center" style="padding:30px 32px 8px 32px;">
        <img src="https://podmindai.com/logo-full-light.png" alt="PodMind AI" width="140" style="display:block;" />
      </td></tr>
      <tr><td align="center" style="padding:12px 32px 0 32px;">
        <h1 style="margin:0 0 10px 0;font-size:20px;color:#101828;">Join ${escapeHtml(organization)}</h1>
        <p style="margin:0 0 6px 0;font-size:14px;line-height:22px;color:#475467;">
          ${inviter ? `${escapeHtml(inviter)} has invited you` : "You have been invited"} to work on podcasts together in PodMind AI, as a <strong>${role}</strong>.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:22px 32px;">
        <a href="${url}" style="display:inline-block;background-color:#2E7FFF;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 34px;border-radius:8px;">
          Accept invitation
        </a>
      </td></tr>
      <tr><td align="center" style="padding:0 32px 8px 32px;">
        <p style="margin:0;font-size:13px;line-height:20px;color:#667085;">
          This invitation is for <strong>${escapeHtml(email)}</strong> and expires in ${INVITE_TTL_DAYS} days. If you weren&rsquo;t expecting it, you can ignore this email.
        </p>
      </td></tr>
      <tr><td align="center" style="padding:22px 32px 26px 32px;border-top:1px solid #eef1f6;">
        <p style="margin:14px 0 0 0;font-size:12px;color:#98a2b3;">
          &copy; PodMind AI &middot; <a href="${this.appUrl}" style="color:#2E7FFF;text-decoration:none;">podmindai.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>`,
      text: [
        `${inviter ? `${inviter} invited you` : "You are invited"} to join ${organization} on PodMind AI as a ${role}.`,
        ``,
        `Accept: ${url}`,
        ``,
        `This invitation is for ${email} and expires in ${INVITE_TTL_DAYS} days.`,
      ].join("\n"),
    });
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
