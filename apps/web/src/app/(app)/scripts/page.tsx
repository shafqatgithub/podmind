import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Scripts" };

export default function Page() {
  return (
    <>
      <PageHeader title="Scripts" description="Outlines and full episode scripts." />
      <EmptyState icon={FileText} title="No scripts yet" description="AI-drafted outlines and scripts, with versions and reviews, will live here." />
    </>
  );
}
