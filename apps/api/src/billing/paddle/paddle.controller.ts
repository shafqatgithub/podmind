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
import { Public } from "../../auth/supabase-auth.guard";
import { PaddleWebhookService } from "./paddle.webhook.service";
import { verifyPaddleSignature } from "./paddle.signature";

/**
 * Paddle webhook receiver — /api/v1/billing/paddle/webhook
 *
 * Public by necessity: Paddle calls it, not a signed-in user. The signature
 * is what authenticates the request, so verification happens before the body
 * is trusted for anything at all.
 */
@Controller("billing/paddle")
export class PaddleController {
  private readonly logger = new Logger(PaddleController.name);

  constructor(
    private readonly webhooks: PaddleWebhookService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<Request>,
    @Body() body: Record<string, unknown>,
  ) {
    const secret = this.config.get<string>("PADDLE_WEBHOOK_SECRET");
    if (!secret) {
      // Refusing is safer than accepting unverified billing events.
      this.logger.error("paddle webhook received but PADDLE_WEBHOOK_SECRET is not set");
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Webhook verification is not configured",
      });
    }

    const raw = request.rawBody;
    if (!raw) {
      throw new BadRequestException({
        code: "INVALID_REQUEST",
        message: "Raw body unavailable",
      });
    }

    const signature = request.headers["paddle-signature"];
    const result = verifyPaddleSignature(
      raw,
      Array.isArray(signature) ? signature[0] : signature,
      secret,
    );

    if (!result.valid) {
      this.logger.warn({ reason: result.reason }, "rejected paddle webhook");
      throw new UnauthorizedException({
        code: "UNAUTHORIZED",
        message: "Invalid webhook signature",
      });
    }

    const outcome = await this.webhooks.handle(body);
    if (!outcome.handled) {
      // Acknowledged with the reason recorded: retrying will not fix a
      // payload we cannot map, and Paddle would retry forever.
      this.logger.warn({ reason: outcome.reason }, "paddle webhook not actioned");
      return { received: true, actioned: false, reason: outcome.reason };
    }

    return { received: true, actioned: true, action: outcome.action };
  }
}
