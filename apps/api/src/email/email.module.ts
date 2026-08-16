import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";

/**
 * Global because email is cross-cutting: reminders, billing warnings and
 * anything else that needs to reach a user outside the app should not each
 * have to wire up their own transport.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
