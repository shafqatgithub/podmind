import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminForgotForm } from "@/components/admin/admin-forgot-form";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense>
      <AdminForgotForm />
    </Suspense>
  );
}
