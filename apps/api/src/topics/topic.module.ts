import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { TopicController } from "./topic.controller";
import { TopicService } from "./topic.service";
import { TopicRepository } from "./topic.repository";

@Module({
  imports: [AiModule],
  controllers: [TopicController],
  providers: [TopicService, TopicRepository],
  exports: [TopicService],
})
export class TopicModule {}
