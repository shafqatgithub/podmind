import { Injectable } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { ApiKeyRepository } from "./api-key.repository";
import type { CreateApiKeyDto } from "./dto/api-key.dto";

@Injectable()
export class ApiKeyService {
  constructor(private readonly repository: ApiKeyRepository) {}

  create(tenant: TenantContext, dto: CreateApiKeyDto) {
    return this.repository.create(tenant, dto);
  }

  async list(tenant: TenantContext) {
    return { items: await this.repository.list(tenant) };
  }

  revoke(tenant: TenantContext, id: string) {
    return this.repository.revoke(tenant, id);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
