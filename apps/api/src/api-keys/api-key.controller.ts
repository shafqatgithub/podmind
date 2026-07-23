import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ApiKeyService } from "./api-key.service";
import { CreateApiKeyDto } from "./dto/api-key.dto";

/** API keys for the Public API — /api/v1/api-keys */
@Controller("api-keys")
export class ApiKeyController {
  constructor(
    private readonly keys: ApiKeyService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Returns the plaintext secret exactly once; it is not recoverable later. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateApiKeyDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.keys.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.keys.list(tenant);
  }

  @Post(":id/revoke")
  async revoke(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.keys.revoke(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.keys.remove(tenant, id);
  }
}
