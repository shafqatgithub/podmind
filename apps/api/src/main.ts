import { NestFactory } from "@nestjs/core";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger } from "nestjs-pino";
import helmet from "helmet";
import { AppModule } from "./app.module";
import type { Env } from "./config/env";

async function bootstrap(): Promise<void> {
  // rawBody is required by the Paddle webhook: its signature covers the exact
  // bytes received, so a re-serialised body would fail verification.
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);

  app.use(helmet());
  app.enableCors({
    origin: config.get("CORS_ORIGINS", { infer: true }),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id", "Idempotency-Key"],
  });

  // Documented routing: /api/v1/... (30-API-SDK-Plan §Versioning)
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  app.enableShutdownHooks();

  const port = config.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");

  // Deploy logs must answer "is it up, and on which port?" without guesswork.
  app
    .get(Logger)
    .log(
      `PodMind API listening on 0.0.0.0:${port} (env PORT=${process.env.PORT ?? "unset"}, NODE_ENV=${config.get("NODE_ENV", { infer: true })})`,
    );
}

void bootstrap().catch((error: unknown) => {
  // Without this, a boot failure exits silently and the platform only
  // reports an unhealthy container with no cause.
  // eslint-disable-next-line no-console
  console.error(
    "FATAL: PodMind API failed to start:",
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  process.exit(1);
});
