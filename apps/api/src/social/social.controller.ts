import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { SocialService } from "./social.service";
import { CreateSocialDto, ListSocialQueryDto } from "./dto/social.dto";

/** Social Media Engine — /api/v1/social */
@Controller("social")
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSocialDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.social.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListSocialQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.social.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.social.findOne(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.social.remove(tenant, id);
  }
}
