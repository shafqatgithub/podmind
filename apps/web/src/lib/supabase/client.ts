import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — auth only.
 * Returns null when the environment is not configured so the UI degrades
 * gracefully (no client-side crash) instead of throwing at render time.
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (typeof window !== "undefined") {
      console.warn("[podmind] Supabase env not configured — auth disabled.");
    }
    return null;
  }
  return createBrowserClient(url, key);
}
