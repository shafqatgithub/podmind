import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { validateEnv } from "./config/env";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { EnvelopeInterceptor } from "./common/interceptors/envelope.interceptor";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { AiModule } from "./ai/ai.module";
import { ResearchModule } from "./research/research.module";
import { ChatModule } from "./chat/chat.module";
import { KnowledgeModule } from "./knowledge/knowledge.module";
import { TenancyModule } from "./tenancy/tenancy.module";
import { ProjectsModule } from "./projects/projects.module";
import { SupabaseAuthGuard } from "./auth/supabase-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        // Request-id: incoming x-request-id respected, otherwise generated;
        // echoed back by main.ts and stamped on every envelope + log line.
        genReqId: (req) => (req.headers["x-request-id"] as string) ?? randomUUID(),
        redact: ["req.headers.authorization", "req.headers.cookie"],
        customProps: (req) => ({ request_id: (req as { id?: string }).id }),
        autoLogging: { ignore: (req) => req.url === "/api/v1/health" },
        transport:
          process.env.NODE_ENV === "development"
            ? { target: "pino-pretty", options: { singleLine: true } }
            : undefined,
      },
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AiModule,
    TenancyModule,
    ProjectsModule,
    ResearchModule,
    ChatModule,
    KnowledgeModule,
  ],
  providers: [
    SupabaseAuthGuard,
    { provide: APP_GUARD, useExisting: SupabaseAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: EnvelopeInterceptor },
  ],
})
export class AppModule {}
