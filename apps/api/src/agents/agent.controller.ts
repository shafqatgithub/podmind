import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";
import { TenancyService } from "../tenancy/tenancy.service";
import { AgentService } from "./agent.service";
import { CreateRunDto, ListRunsQueryDto } from "./dto/agent.dto";

/** AI Agents — /api/v1/agents */
@Controller("agents")
export class AgentController {
  constructor(
    private readonly agents: AgentService,
    private readonly tenancy: TenancyService,
  ) {}

  @Get()
  listAgents() {
    return this.agents.listAgents();
  }

  /** Start a pipeline. Returns immediately; poll the run for progress. */
  @Post("runs")
  async createRun(@CurrentUser() user: AuthUser, @Body() dto: CreateRunDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.agents.createRun(tenant, dto);
  }

  @Get("runs")
  async listRuns(@CurrentUser() user: AuthUser, @Query() query: ListRunsQueryDto) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.agents.list(tenant, query.project_id, query.limit);
  }

  @Get("runs/:id")
  async findRun(@CurrentUser() user: AuthUser, @Param("id", ParseUUIDPipe) id: string) {
    const tenant = await this.tenancy.resolve(user.id);
    return this.agents.findOne(tenant, id);
  }
}
