import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <>
      <PageHeader title="Projects" description="Every episode starts as a project." />
      <EmptyState icon={FolderKanban} title="No projects yet" description="Projects hold your research, guests, outlines and scripts for each episode. Creation unlocks with the core modules stage." />
    </>
  );
}
