import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your workspace at a glance." />
      <DashboardWorkspace />
    </>
  );
}
