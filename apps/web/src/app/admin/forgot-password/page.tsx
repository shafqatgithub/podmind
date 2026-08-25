import type { Metadata } from "next";
import { AdminForgotForm } from "@/components/admin/admin-forgot-form";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AdminForgotForm />;
}
