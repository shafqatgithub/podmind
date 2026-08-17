import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { IsEmail, IsIn } from "class-validator";
import { CurrentUser, Public, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import {
  ORGANIZATION_ROLES,
  OrganizationService,
  type OrganizationRole,
} from "./organization.service";

class InviteDto {
  @IsEmail({}, { message: "Enter a valid email address" })
  email!: string;

  @IsIn(ORGANIZATION_ROLES.filter((r) => r !== "owner"))
  role!: OrganizationRole;
}

class UpdateRoleDto {
  @IsIn(ORGANIZATION_ROLES.filter((r) => r !== "owner"))
  role!: OrganizationRole;
}

/**
 * Organization membership — /api/v1/organization
 *
 * Invite preview and acceptance sit behind authentication like everything
 * else: someone accepting an invitation has to be signed in as the person it
 * was sent to, and the check needs an identity to compare against.
 */
@Controller({ path: "organization", version: "1" })
export class OrganizationController {
  constructor(
    private readonly organizations: OrganizationService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get("members")
  async members(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.organizations.listMembers(tenant);
  }

  @Post("invitations")
  async invite(@CurrentUser() user: AuthUser, @Body() dto: InviteDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.organizations.invite(tenant, dto);
  }

  @Delete("invitations/:id")
  async revoke(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.organizations.revokeInvite(tenant, id);
  }

  @Patch("members/:id")
  async updateRole(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.organizations.updateRole(tenant, id, dto.role);
  }

  @Delete("members/:id")
  async removeMember(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.organizations.removeMember(tenant, id);
  }

  /**
   * What this link is for, shown before anyone commits to joining.
   *
   * Public: the link arrives by email, often opened on a phone that is not
   * signed in. Demanding a login just to *see* the invitation means the
   * recipient meets an error instead of an explanation — and the token here
   * only reveals an organization name and the address it was sent to.
   * Accepting still requires being signed in as that person.
   */
  @Public()
  @Get("invitations/preview")
  async preview(@Query("token") token: string) {
    return this.organizations.previewInvite(token);
  }

  @Post("invitations/accept")
  async accept(@CurrentUser() user: AuthUser, @Body() body: { token: string }) {
    return this.organizations.acceptInvite(user.id, user.email ?? "", body.token);
  }
}
