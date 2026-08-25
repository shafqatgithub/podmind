import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

/** Rendered per request so a signed-in visitor is never handed a cached page. */
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
