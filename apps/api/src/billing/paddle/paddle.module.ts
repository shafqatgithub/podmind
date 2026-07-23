import { Module } from "@nestjs/common";
import { PaddleController } from "./paddle.controller";
import { PaddleWebhookService } from "./paddle.webhook.service";
import { PaddleRepository } from "./paddle.repository";

@Module({
  controllers: [PaddleController],
  providers: [PaddleWebhookService, PaddleRepository],
  exports: [PaddleWebhookService, PaddleRepository],
})
export class PaddleModule {}
