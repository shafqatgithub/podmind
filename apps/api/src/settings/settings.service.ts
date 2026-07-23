import { Injectable } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { SettingsRepository } from "./settings.repository";
import type {
  UpdateOrganizationSettingsDto,
  UpdatePreferencesDto,
  UpdateProfileDto,
} from "./dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(private readonly repository: SettingsRepository) {}

  /** Everything the settings page needs in one round trip. */
  async getAll(tenant: TenantContext) {
    const [profile, preferences, organization, usage] = await Promise.all([
      this.repository.getProfile(tenant.userId),
      this.repository.getPreferences(tenant.userId),
      this.repository.getOrganization(tenant),
      this.repository.getUsage(tenant),
    ]);
    return { profile, preferences, organization, usage };
  }

  updateProfile(tenant: TenantContext, dto: UpdateProfileDto) {
    return this.repository.updateProfile(tenant.userId, { ...dto });
  }

  updatePreferences(tenant: TenantContext, dto: UpdatePreferencesDto) {
    return this.repository.updatePreferences(tenant.userId, { ...dto });
  }

  updateOrganization(tenant: TenantContext, dto: UpdateOrganizationSettingsDto) {
    return this.repository.updateOrganization(tenant, { ...dto });
  }
}
