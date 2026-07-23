import { Injectable } from "@nestjs/common";
import type { TenantContext } from "../tenancy/tenancy.service";
import { MemoryRepository } from "./memory.repository";
import type { CreateMemoryDto, ListMemoryQueryDto, UpdateMemoryDto } from "./dto/memory.dto";

@Injectable()
export class MemoryService {
  constructor(private readonly repository: MemoryRepository) {}

  create(tenant: TenantContext, dto: CreateMemoryDto) {
    return this.repository.create(tenant, dto);
  }

  async list(tenant: TenantContext, query: ListMemoryQueryDto) {
    const [items, stats] = await Promise.all([
      this.repository.list(tenant, query),
      this.repository.stats(tenant),
    ]);
    return { items, stats };
  }

  findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }

  update(tenant: TenantContext, id: string, dto: UpdateMemoryDto) {
    return this.repository.update(tenant, id, dto);
  }

  async remove(tenant: TenantContext, id: string) {
    await this.repository.remove(tenant, id);
    return { deleted: true };
  }
}
