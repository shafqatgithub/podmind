import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <DashboardWorkspace />;
}
