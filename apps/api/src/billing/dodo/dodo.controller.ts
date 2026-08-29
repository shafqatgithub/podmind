import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { IsIn, IsString } from "class-validator";
import { CurrentUser, Public, type AuthUser } from "../../auth/supabase-auth.guard";
import { TenancyService } from "../../tenancy/tenancy.service";
import { DodoService } from "./dodo.service";
import { DodoWebhookService } from "./dodo.webhook.service";
import { verifyDodoSignature } from "./dodo.signature";

export class CreateCheckoutDto {
  @IsString()
  plan_slug!: string;

  @IsIn(["monthly", "yearly"])
  billing_cycle!: "monthly" | "yearly";
}

/**
 * Dodo Payments — /api/v1/billing/dodo
 *
 * Two very different callers hit this controller: a signed-in user starting
 * a purchase, and Dodo itself delivering a webhook. The webhook route is
 * public by necessity — Dodo calls it, not a browser session — so its
 * signature is what authenticates the request, checked before the body is
 * trusted for anything.
 */
@Controller("billing/dodo")
export class DodoController {
  private readonly logger = new Logger(DodoController.name);

  constructor(
    private readonly dodo: DodoService,
    private readonly webhooks: DodoWebhookService,
    private readonly tenancy: TenancyService,
    private readonly config: ConfigService,
  ) {}

  @Post("checkout")
  async checkout(@CurrentUser() user: AuthUser, @Body() dto: CreateCheckoutDto) {
    const tenant = await this.tenancy.resolve(user.id);
    const siteUrl = this.config.get<string>("SITE_URL") ?? "https://podmindai.com";
    const { checkoutUrl } = await this.dodo.createCheckoutSession({
      planSlug: dto.plan_slug,
      billingCycle: dto.billing_cycle,
      organizationId: tenant.organizationId,
      email: user.email ?? null,
      returnUrl: `${siteUrl}/billing?checkout=success`,
    });
    return { checkout_url: checkoutUrl };
  }

  @Public()
  @Post("webhook")
  @HttpCode(200)
  async webhook(@Req() request: RawBodyRequest<Request>, @Body() body: Record<string, unknown>) {
    const secret = this.config.get<string>("DODO_PAYMENTS_WEBHOOK_SECRET");
    if (!secret) {
      this.logger.error("dodo webhook received but DODO_PAYMENTS_WEBHOOK_SECRET is not set");
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Webhook verification is not configured",
      });
    }

    const raw = request.rawBody;
    if (!raw) {
      throw new BadRequestException({ code: "INVALID_REQUEST", message: "Raw body unavailable" });
    }

    const header = (name: string) => {
      const v = request.headers[name];
      return Array.isArray(v) ? v[0] : v;
    };

    const result = verifyDodoSignature(
      raw,
      {
        id: header("webhook-id"),
        timestamp: header("webhook-timestamp"),
        signature: header("webhook-signature"),
      },
      secret,
    );

    if (!result.valid) {
      this.logger.warn({ reason: result.reason }, "rejected dodo webhook");
      throw new UnauthorizedException({ code: "UNAUTHORIZED", message: "Invalid webhook signature" });
    }

    const outcome = await this.webhooks.handle(body);
    if (!outcome.handled) {
      this.logger.warn({ reason: outcome.reason }, "dodo webhook not actioned");
      return { received: true, actioned: false, reason: outcome.reason };
    }

    return { received: true, actioned: true, action: outcome.action };
  }
}
