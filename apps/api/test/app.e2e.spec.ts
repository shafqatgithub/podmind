import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";

/**
 * Boots the real AppModule (real pg pool against the local schema clone)
 * and asserts the documented envelope contract end-to-end.
 */
describe("API foundation (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health returns the documented success envelope", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    expect(res.body).toMatchObject({
      success: true,
      data: { status: "ok" },
      error: null,
      version: "v1",
    });
    // Identifies the running build; "unknown" when not set by the platform.
    expect(typeof res.body.data.commit).toBe("string");
    expect(new Date(res.body.data.started_at).toString()).not.toBe("Invalid Date");
    expect(typeof res.body.request_id).toBe("string");
    expect(new Date(res.body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("GET /api/v1/health/ready reports database up", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.details.database.status).toBe("up");
  });

  it("unknown route returns the documented error envelope", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/nope").expect(404);
    expect(res.body).toMatchObject({
      success: false,
      data: null,
      version: "v1",
    });
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(typeof res.body.error.message).toBe("string");
  });
});
