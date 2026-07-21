import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { KnowledgeWorkspace } from "@/components/knowledge/knowledge-workspace";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Knowledge Hub"
        description="Documents your assistant can search and quote — transcripts, notes, research."
      />
      <KnowledgeWorkspace />
    </>
  );
}
