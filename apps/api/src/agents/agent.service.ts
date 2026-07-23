import { Injectable, Logger } from "@nestjs/common";
import { ResearchService } from "../research/research.service";
import { OutlineService } from "../outlines/outline.service";
import { ScriptService } from "../scripts/script.service";
import { SeoService } from "../seo/seo.service";
import { SocialService } from "../social/social.service";
import type { TenantContext } from "../tenancy/tenancy.service";
import { AgentRepository } from "./agent.repository";
import { PIPELINE_STEPS, type CreateRunDto, type PipelineStep } from "./dto/agent.dto";

/** Which catalogue agent owns each step. */
const STEP_AGENT: Record<PipelineStep, string> = {
  research: "research-agent",
  outline: "outline-agent",
  script: "script-writer",
  seo: "seo-agent",
  social: "social-agent",
};

const STEP_LABEL: Record<PipelineStep, string> = {
  research: "Research the topic",
  outline: "Build the outline",
  script: "Write the script",
  seo: "Generate SEO",
  social: "Write social posts",
};

/** What each step needs from an earlier one before it can run. */
const STEP_REQUIRES: Partial<Record<PipelineStep, PipelineStep>> = {
  seo: "script",
  social: "script",
};

/** Artifacts produced as the pipeline runs, fed forward into later steps. */
interface PipelineContext {
  researchSessionId?: string;
  outlineId?: string;
  scriptId?: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly repository: AgentRepository,
    private readonly research: ResearchService,
    private readonly outlines: OutlineService,
    private readonly scripts: ScriptService,
    private readonly seo: SeoService,
    private readonly social: SocialService,
  ) {}

  async listAgents() {
    return { items: await this.repository.listAgents() };
  }

  /**
   * Start a pipeline.
   *
   * A full run takes minutes, which no HTTP request should be held open for,
   * so this creates the session and its queued tasks, returns immediately,
   * and executes in the background. The client polls findOne for progress.
   *
   * The trade-off is honest: execution lives in this process, so a restart
   * mid-run orphans the tasks. reapStaleRuns turns those into a reported
   * failure rather than a spinner that never resolves. A durable queue is the
   * right answer once more than one instance runs.
   */
  async createRun(tenant: TenantContext, dto: CreateRunDto) {
    const project = await this.repository.assertProjectInTenant(tenant, dto.project_id);
    await this.repository.reapStaleRuns();

    // The pipeline order is fixed; the request only chooses which to include.
    const steps = PIPELINE_STEPS.filter((s) => dto.steps.includes(s));

    const session = await this.repository.createSession(tenant, {
      projectId: project.id,
      name: dto.topic.slice(0, 200),
      metadata: {
        topic: dto.topic,
        steps,
        duration_minutes: dto.duration_minutes ?? null,
        guest_name: dto.guest_name ?? null,
        provider: dto.provider ?? null,
      },
    });

    const agentIds = await this.repository.agentIdBySlug();
    const tasks: { id: string; step: PipelineStep }[] = [];
    for (const [index, step] of steps.entries()) {
      const task = await this.repository.createTask({
        sessionId: session.id,
        agentId: agentIds.get(STEP_AGENT[step]) ?? null,
        name: STEP_LABEL[step],
        type: step,
        priority: index,
      });
      tasks.push({ id: task.id, step });
    }

    // Fire and forget: the caller gets the session id straight away.
    void this.execute(tenant, session.id, tasks, dto).catch((err: unknown) => {
      this.logger.error({ session: session.id, err }, "pipeline crashed");
    });

    return this.repository.findOne(tenant, session.id);
  }

  private async execute(
    tenant: TenantContext,
    sessionId: string,
    tasks: { id: string; step: PipelineStep }[],
    dto: CreateRunDto,
  ): Promise<void> {
    const context: PipelineContext = {};
    const completed = new Set<PipelineStep>();
    let failures = 0;

    for (const { id: taskId, step } of tasks) {
      // A step whose input never materialised is skipped with the reason,
      // rather than run against nothing and produce something worthless.
      const requires = STEP_REQUIRES[step];
      if (requires && !completed.has(requires)) {
        await this.repository.skipTask(
          taskId,
          `Skipped because the ${requires} step did not complete`,
        );
        await this.repository.log(sessionId, taskId, "warn", `skipped ${step}`);
        continue;
      }

      const startedAt = Date.now();
      await this.repository.startTask(taskId);

      try {
        const output = await this.runStep(tenant, step, dto, context);
        await this.repository.completeTask(taskId, output, Date.now() - startedAt);
        completed.add(step);
      } catch (err) {
        failures += 1;
        const message = err instanceof Error ? err.message : "The step failed";
        await this.repository.failTask(taskId, message, Date.now() - startedAt);
        await this.repository.log(sessionId, taskId, "error", `${step}: ${message}`);

        // Out of credits stops everything; one bad step does not.
        if (message.toLowerCase().includes("credit")) {
          for (const remaining of tasks.slice(tasks.findIndex((t) => t.id === taskId) + 1)) {
            await this.repository.skipTask(remaining.id, "Skipped — out of AI credits");
          }
          break;
        }
      }
    }

    await this.repository.finishSession(
      sessionId,
      failures === 0 ? "completed" : completed.size > 0 ? "partial" : "failed",
    );
  }

  /** Runs one step and returns a small summary for the task's output column. */
  private async runStep(
    tenant: TenantContext,
    step: PipelineStep,
    dto: CreateRunDto,
    context: PipelineContext,
  ): Promise<Record<string, unknown>> {
    const provider = dto.provider;

    switch (step) {
      case "research": {
        const result = await this.research.create(tenant, {
          project_id: dto.project_id,
          topic: dto.topic,
          depth: "standard",
          ...(provider ? { provider } : {}),
        });
        context.researchSessionId = result.id;
        return { research_session_id: result.id };
      }

      case "outline": {
        const result = await this.outlines.create(tenant, {
          project_id: dto.project_id,
          topic: dto.topic,
          ...(context.researchSessionId
            ? { research_session_id: context.researchSessionId }
            : {}),
          ...(dto.duration_minutes ? { duration_minutes: dto.duration_minutes } : {}),
          ...(dto.guest_name ? { guest_name: dto.guest_name } : {}),
          ...(provider ? { provider } : {}),
        });
        context.outlineId = result.id;
        return { outline_id: result.id };
      }

      case "script": {
        const result = await this.scripts.create(tenant, {
          project_id: dto.project_id,
          ...(context.outlineId ? { outline_id: context.outlineId } : { topic: dto.topic }),
          ...(dto.duration_minutes ? { duration_minutes: dto.duration_minutes } : {}),
          ...(dto.guest_name ? { guest_name: dto.guest_name } : {}),
          ...(provider ? { provider } : {}),
        });
        context.scriptId = result.id;
        return { script_id: result.id };
      }

      case "seo": {
        const result = await this.seo.create(tenant, {
          project_id: dto.project_id,
          ...(context.scriptId ? { script_id: context.scriptId } : { topic: dto.topic }),
          ...(provider ? { provider } : {}),
        });
        return { seo_id: result.id };
      }

      case "social": {
        const result = await this.social.create(tenant, {
          project_id: dto.project_id,
          platforms: ["x", "linkedin", "instagram"],
          ...(context.scriptId ? { script_id: context.scriptId } : { topic: dto.topic }),
          ...(provider ? { provider } : {}),
        });
        return { social_id: result.id };
      }
    }
  }

  async list(tenant: TenantContext, projectId?: string, limit?: number) {
    return { items: await this.repository.list(tenant, projectId, limit) };
  }

  async findOne(tenant: TenantContext, id: string) {
    return this.repository.findOne(tenant, id);
  }
}
