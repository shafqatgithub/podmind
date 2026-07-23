import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { SocialController } from "./social.controller";
import { SocialService } from "./social.service";
import { SocialRepository } from "./social.repository";

@Module({
  imports: [AiModule],
  controllers: [SocialController],
  providers: [SocialService, SocialRepository],
  exports: [SocialService],
})
export class SocialModule {}
