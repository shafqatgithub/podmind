/**
 * Routes that require a signed-in user.
 *
 * This exists as one list because it drifted: modules were added over time
 * and the middleware's copy was not updated, so eleven routes — including
 * /admin and /billing — rendered their shell to signed-out visitors instead
 * of redirecting to login. The API refused their data, so nothing leaked,
 * but the behaviour was wrong and would have kept getting wronger.
 *
 * Everything under app/(app) belongs here. If you add a screen there, add it
 * here in the same commit.
 */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/projects",
  "/topics",
  "/agents",
  "/research",
  "/outlines",
  "/scripts",
  "/guests",
  "/fact-checks",
  "/seo",
  "/social",
  "/chat",
  "/knowledge",
  "/memory",
  "/analytics",
  "/billing",
  "/api-keys",
  "/settings",
  "/admin",
  "/onboarding",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
