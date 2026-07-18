import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email link verification. Supabase's default template redirects with
 * `?code=` (PKCE) while token-based templates send `token_hash` + `type`.
 * Both are handled so verification works with any template configuration.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = type === "recovery" ? "/reset-password" : "/dashboard";

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Link consumed already (e.g. mail scanner) — if a session exists the
  // user is verified; send them in instead of showing a failure.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(`${origin}/dashboard`);

  return NextResponse.redirect(`${origin}/login?error=verification`);
}
