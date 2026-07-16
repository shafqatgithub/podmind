import type { Metadata } from "next";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Research" };

export default function Page() {
  return (
    <>
      <PageHeader title="Research" description="AI-powered episode research sessions." />
      <EmptyState icon={Search} title="No research sessions yet" description="Run deep AI research on any topic — summaries, statistics, sources and podcast angles land here." />
    </>
  );
}
