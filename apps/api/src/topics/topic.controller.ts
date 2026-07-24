import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { TopicService } from "./topic.service";
import { DiscoverTopicsDto, ListDiscoveriesQueryDto, SaveTopicDto } from "./dto/topic.dto";

/** Topic discovery — /api/v1/topics */
@Controller("topics")
export class TopicController {
  constructor(
    private readonly topics: TopicService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Whether discovery can run at all, so the UI can say why not. */
  @Get("status")
  status() {
    return { search_available: this.topics.searchAvailable() };
  }

  @Post("discover")
  async discover(@CurrentUser() user: AuthUser, @Body() dto: DiscoverTopicsDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.topics.discover(tenant, dto);
  }

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query() query: ListDiscoveriesQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.topics.list(tenant, query.project_id);
  }

  @Get(":id")
  async findOne(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.topics.findOne(tenant, id);
  }

  @Patch("saved/:topicId")
  async setSaved(
    @CurrentUser() user: AuthUser,
    @Param("topicId", ParseUUIDPipe) topicId: string,
    @Body() dto: SaveTopicDto,
  ) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.topics.setSaved(tenant, topicId, dto.is_saved);
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.topics.remove(tenant, id);
  }
}
