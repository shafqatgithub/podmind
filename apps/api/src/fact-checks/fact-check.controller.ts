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
import { FactCheckService } from "./fact-check.service";
import { CreateFactCheckDto, ListFactChecksQueryDto } from "./dto/fact-check.dto";

/** Fact Checker API — /api/v1/fact-checks */
@Controller("fact-checks")
export class FactCheckController {
  constructor(
    private readonly factChecks: FactCheckService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Run a check against a script, research session or pasted text. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateFactCheckDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.factChecks.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListFactChecksQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.factChecks.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.factChecks.findOne(tenant, id);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.factChecks.remove(tenant, id);
  }
}
