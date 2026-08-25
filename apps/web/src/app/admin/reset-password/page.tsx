import type { Metadata } from "next";
import { AdminResetForm } from "@/components/admin/admin-reset-form";

export const metadata: Metadata = { title: "Set new password" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <AdminResetForm />;
}
