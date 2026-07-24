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
  "POST /api/v1/outlines",
  "GET /api/v1/outlines",
  "GET /api/v1/outlines/:id",
  "DELETE /api/v1/outlines/:id",
  "POST /api/v1/scripts",
  "GET /api/v1/scripts",
  "GET /api/v1/scripts/:id",
  "DELETE /api/v1/scripts/:id",
  "GET /api/v1/exports/formats",
  "GET /api/v1/exports/scripts/:id",
  "GET /api/v1/exports/outlines/:id",
  "GET /api/v1/exports/research/:id",
  "GET /api/v1/billing/plans",
  "GET /api/v1/billing",
  "POST /api/v1/api-keys",
  "GET /api/v1/api-keys",
  "POST /api/v1/api-keys/:id/revoke",
  "DELETE /api/v1/api-keys/:id",
  "POST /api/v1/memory",
  "GET /api/v1/memory",
  "GET /api/v1/memory/:id",
  "PATCH /api/v1/memory/:id",
  "DELETE /api/v1/memory/:id",
  "GET /api/v1/notifications",
  "GET /api/v1/notifications/preferences",
  "PATCH /api/v1/notifications/preferences",
  "POST /api/v1/notifications/read-all",
  "PATCH /api/v1/notifications/:id/read",
  "DELETE /api/v1/notifications/:id",
  "POST /api/v1/seo",
  "GET /api/v1/seo",
  "GET /api/v1/seo/:id",
  "PATCH /api/v1/seo/:id/selection",
  "DELETE /api/v1/seo/:id",
  "POST /api/v1/social",
  "GET /api/v1/social",
  "GET /api/v1/social/:id",
  "DELETE /api/v1/social/:id",
  "POST /api/v1/guests",
  "POST /api/v1/guests/manual",
  "GET /api/v1/guests",
  "GET /api/v1/guests/:id",
  "POST /api/v1/guests/:id/notes",
  "DELETE /api/v1/guests/:id",
  "POST /api/v1/chat/conversations/:id/messages/stream",
  "POST /api/v1/billing/paddle/webhook",
  "GET /api/v1/admin",
  "GET /api/v1/admin/organizations",
  "GET /api/v1/admin/ai-usage",
  "GET /api/v1/admin/health",
  "GET /api/v1/admin/flags",
  "POST /api/v1/admin/flags",
  "DELETE /api/v1/admin/flags/:id",
  "GET /api/v1/admin/announcements",
  "POST /api/v1/admin/announcements",
  "PATCH /api/v1/admin/announcements/:id",
  "GET /api/v1/admin/tickets",
  "PATCH /api/v1/admin/tickets/:id",
  "GET /api/v1/topics/status",
  "POST /api/v1/topics/discover",
  "GET /api/v1/topics",
  "GET /api/v1/topics/:id",
  "PATCH /api/v1/topics/saved/:topicId",
  "DELETE /api/v1/topics/:id",
  "GET /api/v1/agents",
  "POST /api/v1/agents/runs",
  "GET /api/v1/agents/runs",
  "GET /api/v1/agents/runs/:id",
  "GET /api/v1/settings",
  "PATCH /api/v1/settings/profile",
  "PATCH /api/v1/settings/preferences",
  "PATCH /api/v1/settings/organization",
  "POST /api/v1/fact-checks",
  "GET /api/v1/fact-checks",
  "GET /api/v1/fact-checks/:id",
  "DELETE /api/v1/fact-checks/:id",
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
