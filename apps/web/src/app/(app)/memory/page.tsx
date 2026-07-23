import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";

export const metadata: Metadata = { title: "AI Memory" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="AI Memory"
        description="What PodMind remembers about you and your show — visible, editable, and yours to delete."
      />
      <MemoryWorkspace />
    </>
  );
}
