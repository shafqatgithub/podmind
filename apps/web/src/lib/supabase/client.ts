import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client — auth only (data flows through the NestJS API). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
