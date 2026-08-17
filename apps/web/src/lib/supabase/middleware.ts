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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
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
