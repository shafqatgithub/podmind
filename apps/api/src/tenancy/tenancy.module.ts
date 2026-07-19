import { Global, Module } from "@nestjs/common";
import { TenancyService } from "./tenancy.service";

/** Global: every feature module resolves the caller's tenant. */
@Global()
@Module({
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}
