import { Global, Module } from "@nestjs/common";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationRepository } from "./notification.repository";

/** Global so any module can emit a notification without importing it. */
@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationModule {}
