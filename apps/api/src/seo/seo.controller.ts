import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { SeoService } from "./seo.service";
import { CreateSeoDto, ListSeoQueryDto, SelectSeoDto } from "./dto/seo.dto";

/** SEO Engine — /api/v1/seo */
@Controller("seo")
export class SeoController {
  constructor(
    private readonly seo: SeoService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSeoDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.seo.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListSeoQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.seo.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.seo.findOne(tenant, id);
  }

  @Patch(":id/selection")
  async select(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SelectSeoDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.seo.select(tenant, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.seo.remove(tenant, id);
  }
}
