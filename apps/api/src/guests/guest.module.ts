import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { GuestController } from "./guest.controller";
import { GuestService } from "./guest.service";
import { GuestRepository } from "./guest.repository";

@Module({
  imports: [AiModule],
  controllers: [GuestController],
  providers: [GuestService, GuestRepository],
  exports: [GuestService],
})
export class GuestModule {}
