import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { ProjectsRepository } from "./projects.repository";
import {
  CreateProjectDto,
  ListProjectsQueryDto,
  UpdateProjectDto,
} from "./dto/project.dto";

/**
 * Projects API — /api/v1/projects
 * Responses are wrapped in the documented envelope by the global interceptor,
 * so handlers return plain data.
 */
@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly repo: ProjectsRepository,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListProjectsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    const { items, nextCursor, hasMore } = await this.repo.list(tenant, query);
    return { items, next_cursor: nextCursor, has_more: hasMore };
  }

  @Get("stats")
  async stats(@CurrentUser() user: AuthUser) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.repo.stats(tenant);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.repo.findById(tenant, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateProjectDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.repo.create(tenant, dto);
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.repo.update(tenant, id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    await this.repo.remove(tenant, id);
  }
}
