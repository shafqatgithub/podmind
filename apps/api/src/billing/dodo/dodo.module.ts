import { Module } from "@nestjs/common";
import { DodoController } from "./dodo.controller";
import { DodoService } from "./dodo.service";
import { DodoWebhookService } from "./dodo.webhook.service";
import { DodoRepository } from "./dodo.repository";

@Module({
  controllers: [DodoController],
  providers: [DodoService, DodoWebhookService, DodoRepository],
  exports: [DodoService],
})
export class DodoModule {}
