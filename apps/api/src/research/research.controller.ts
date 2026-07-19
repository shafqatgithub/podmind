import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ResearchService } from "./research.service";
import { CreateResearchDto, ListResearchQueryDto } from "./dto/research.dto";

/**
 * Research API — /api/v1/research
 * Handlers return plain data; the global interceptor applies the envelope.
 */
@Controller("research")
export class ResearchController {
  constructor(
    private readonly research: ResearchService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Start a research session. Consumes AI credits. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateResearchDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.research.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListResearchQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.research.list(tenant, query);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.research.findOne(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.research.remove(tenant, id);
  }
}
