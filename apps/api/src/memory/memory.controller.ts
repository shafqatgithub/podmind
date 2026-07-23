import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { MemoryService } from "./memory.service";
import { CreateMemoryDto, ListMemoryQueryDto, UpdateMemoryDto } from "./dto/memory.dto";

/** AI Memory — /api/v1/memory */
@Controller("memory")
export class MemoryController {
  constructor(
    private readonly memory: MemoryService,
    private readonly tenancy: TenancyService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateMemoryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.memory.create(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListMemoryQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.memory.list(tenant, query);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.memory.findOne(tenant, id);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.memory.update(tenant, id, dto);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.memory.remove(tenant, id);
  }
}
