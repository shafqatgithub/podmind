import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { SettingsService } from "./settings.service";
import {
  UpdateOrganizationSettingsDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from "./dto/settings.dto";

/** Settings — /api/v1/settings */
@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async getAll(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.settings.getAll(tenant);
  }

  @Patch("profile")
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.settings.updateProfile(tenant, dto);
  }

  @Patch("preferences")
  async updatePreferences(@CurrentUser() user: AuthUser, @Body() dto: UpdatePreferencesDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.settings.updatePreferences(tenant, dto);
  }

  @Patch("organization")
  async updateOrganization(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.settings.updateOrganization(tenant, dto);
  }
}
