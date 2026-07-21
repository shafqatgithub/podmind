import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { KnowledgeModule } from "../knowledge/knowledge.module";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatRepository } from "./chat.repository";

@Module({
  imports: [AiModule, KnowledgeModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRepository],
  exports: [ChatService],
})
export class ChatModule {}
