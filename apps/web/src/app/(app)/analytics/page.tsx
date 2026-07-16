import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return (
    <>
      <PageHeader title="Analytics" description="Understand what works." />
      <EmptyState icon={BarChart3} title="No analytics yet" description="Once you produce episodes with PodMind, performance insights appear here." />
    </>
  );
}
