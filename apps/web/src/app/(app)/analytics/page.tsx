import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Where your AI credits go — usage, cost, provider performance."
      />
      <AnalyticsWorkspace />
    </>
  );
}
