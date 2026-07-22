import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { VersioningType } from "@nestjs/common";
import type { Server } from "node:http";
import { AppModule } from "../src/app.module";

/**
 * Boot contract.
 *
 * Unit and integration suites assemble narrow testing modules, so a module
 * that is never registered in AppModule still passes all of them — its
 * routes simply do not exist at runtime. This suite boots the real
 * AppModule, exactly as production does, and asserts the full route table.
 *
 * Every new feature module must add its routes here.
 */

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean> };
}

function registeredRoutes(app: INestApplication): Set<string> {
  const server = app.getHttpServer() as Server & {
    _events: { request: { router?: { stack?: RouteLayer[] } } };
  };
  const router = server._events.request.router;
  const routes = new Set<string>();
  for (const layer of router?.stack ?? []) {
    if (!layer.route) continue;
    // Nest registers a catch-all per HTTP method for the global prefix
    // (it becomes the 404 handler). Those are framework internals.
    if (layer.route.path === "/api$" || layer.route.path === "/api/{*path}") continue;
    for (const [method, enabled] of Object.entries(layer.route.methods)) {
      if (enabled) routes.add(`${method.toUpperCase()} ${layer.route.path}`);
    }
  }
  return routes;
}

/** The routes the API promises to serve. */
const EXPECTED_ROUTES = [
  "GET /api/v1/health",
  "GET /api/v1/health/ready",
  "GET /api/v1/me",
  "GET /api/v1/ai/status",
  "GET /api/v1/projects",
  "GET /api/v1/projects/stats",
  "GET /api/v1/projects/:id",
  "POST /api/v1/projects",
  "PATCH /api/v1/projects/:id",
  "DELETE /api/v1/projects/:id",
  "POST /api/v1/research",
  "GET /api/v1/research",
  "GET /api/v1/research/:id",
  "DELETE /api/v1/research/:id",
  "POST /api/v1/chat/conversations",
  "GET /api/v1/chat/conversations",
  "GET /api/v1/chat/conversations/:id",
  "PATCH /api/v1/chat/conversations/:id",
  "DELETE /api/v1/chat/conversations/:id",
  "POST /api/v1/chat/conversations/:id/messages",
  "GET /api/v1/knowledge/status",
  "GET /api/v1/knowledge/documents",
  "POST /api/v1/knowledge/documents",
  "DELETE /api/v1/knowledge/documents/:id",
  "POST /api/v1/knowledge/search",
  "GET /api/v1/analytics/overview",
  "GET /api/v1/dashboard",
];

describe("Application boot contract", () => {
  let app: INestApplication;
  let routes: Set<string>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    // Mirror main.ts so the asserted paths are the ones production serves.
    app.setGlobalPrefix("api");
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });
    await app.init();
    routes = registeredRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it("boots the full application", () => {
    expect(app).toBeDefined();
  });

  it.each(EXPECTED_ROUTES)("registers %s", (route) => {
    expect(routes).toContain(route);
  });

  it("registers no unexpected routes", () => {
    expect([...routes].sort()).toEqual([...EXPECTED_ROUTES].sort());
  });
});
