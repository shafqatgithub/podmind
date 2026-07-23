import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

export const metadata: Metadata = { title: "Admin" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Admin"
        description="Platform health, usage and operations."
      />
      <AdminWorkspace />
    </>
  );
}
