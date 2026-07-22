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
import { ScriptService } from "./script.service";
import { CreateScriptDto, ListScriptsQueryDto } from "./dto/script.dto";

/** Script Builder API — /api/v1/scripts */
@Controller("scripts")
export class ScriptController {
  constructor(
    private readonly scripts: ScriptService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Write a full script. Consumes AI credits. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateScriptDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.scripts.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListScriptsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.scripts.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.scripts.findOne(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.scripts.remove(tenant, id);
  }
}
