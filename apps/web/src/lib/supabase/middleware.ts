import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isProtectedPath } from "@/lib/routes";



/**
 * Session refresh + route protection (12-User-Flows: unauthenticated users
 * land on login; authenticated users skip the auth pages).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Deployable-at-every-stage: if Supabase env is not configured yet the
  // site keeps serving (auth simply is not available) instead of 500ing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run code between client creation and getUser().
  //
  // getUser() makes a network call to Supabase. If that call ever hangs
  // (Supabase having a slow moment, a network blip), middleware has no
  // built-in timeout of its own and will run until Vercel force-kills the
  // function after 25s — which is a 504 for every visitor, not just the
  // person mid-request. Racing it against a short local timeout means a
  // slow auth check fails open (treated as "unknown, let the request
  // through") instead of taking the whole site down with it. Real page-
  // and API-level auth checks still apply once the request lands.
  const AUTH_CHECK_TIMEOUT_MS = 4000;
  const authResult = await Promise.race([
    supabase.auth.getUser().then((r) => r.data.user),
    new Promise<"timeout">((resolve) =>
      setTimeout(() => resolve("timeout"), AUTH_CHECK_TIMEOUT_MS),
    ),
  ]).catch(() => "timeout" as const);

  if (authResult === "timeout") {
    return response;
  }
  const user = authResult;

  const { pathname } = request.nextUrl;

  const isNavigationEarly = request.method === "GET" || request.method === "HEAD";

  /**
   * The admin panel is a separate application with its own login. Its login
   * page is public; every other /admin path needs a session and, when signed
   * out, is sent to the admin login rather than the customer one. Handled
   * before the generic rules so admin never falls through to /login.
   */
  if (
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password"
  ) {
    return response;
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user && isNavigationEarly) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  const isProtected = isProtectedPath(pathname);
  const isAuthPage = ["/login", "/signup", "/forgot-password"].some((p) =>
    pathname.startsWith(p),
  );

  /**
   * Only navigations are redirected.
   *
   * A form submission is a POST to the same path, and redirecting it breaks
   * the server action behind it: Next.js receives a redirect where it
   * expected an action result and reports "an unexpected response was
   * received from the server" — which is what a signed-in user saw when they
   * opened a cached /login page and submitted it. Actions must be allowed to
   * run and issue their own redirect.
   */
  const isNavigation = request.method === "GET" || request.method === "HEAD";

  if (!user && isProtected && isNavigation) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (user && isAuthPage && isNavigation) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}
