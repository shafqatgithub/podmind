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
import { OutlineService } from "./outline.service";
import { CreateOutlineDto, ListOutlinesQueryDto } from "./dto/outline.dto";

/** Outline Builder API — /api/v1/outlines */
@Controller("outlines")
export class OutlineController {
  constructor(
    private readonly outlines: OutlineService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Generate an episode outline. Consumes AI credits. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateOutlineDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.outlines.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListOutlinesQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.outlines.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.outlines.findOne(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.outlines.remove(tenant, id);
  }
}
