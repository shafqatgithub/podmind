import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default function Page() {
  return (
    <>
      <PageHeader title="Knowledge Hub" description="Your documents as AI context." />
      <EmptyState icon={BookOpen} title="Knowledge base is empty" description="Upload documents to give every AI agent searchable, citable context about your show." />
    </>
  );
}
