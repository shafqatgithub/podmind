import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Never served from the edge cache.
 *
 * A prerendered /login was handed to people who were already signed in, so
 * the middleware's redirect never reached them and they submitted a form they
 * should never have seen. Rendering per request costs little on a page this
 * small and keeps the redirect honest.
 */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
