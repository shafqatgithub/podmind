import { Controller, Get } from "@nestjs/common";
import { ProviderRegistry } from "./providers/provider.registry";
import { TASK_MIN_CREDITS, TASK_TYPICAL_CREDITS } from "./routing/ai-router.service";
import { TASK_ROUTES } from "./routing/model-selection";
import { CurrentUser, type AuthUser } from "../auth/supabase-auth.guard";

/**
 * Router transparency endpoints — what the platform can do right now and
 * what each task costs. Feature endpoints land in their own modules.
 */
@Controller("ai")
export class AiController {
  constructor(private readonly registry: ProviderRegistry) {}

  /** GET /api/v1/ai/status — configured providers + routing table. */
  @Get("status")
  status(@CurrentUser() _user: AuthUser) {
    const configured = this.registry.configured();
    return {
      providers: this.registry.all().map((p) => ({
        slug: p.slug,
        configured: p.isConfigured(),
      })),
      ready: configured.length > 0,
      tasks: Object.entries(TASK_ROUTES).map(([task, chain]) => ({
        task,
        // Billing is metered, so the UI needs both: the floor it will always
        // be charged, and a typical figure to set expectations before a run.
        credits: TASK_TYPICAL_CREDITS[task as keyof typeof TASK_TYPICAL_CREDITS],
        min_credits: TASK_MIN_CREDITS[task as keyof typeof TASK_MIN_CREDITS],
        route: chain.map((c) => `${c.provider}:${c.family}`),
        available: chain.some((c) => configured.includes(c.provider)),
      })),
    };
  }
}
