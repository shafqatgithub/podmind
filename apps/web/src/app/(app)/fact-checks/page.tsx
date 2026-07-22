import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { FactCheckWorkspace } from "@/components/fact-checks/fact-check-workspace";

export const metadata: Metadata = { title: "Fact Checker" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Fact Checker"
        description="Verify the claims in your script before they go on air."
      />
      <FactCheckWorkspace />
    </>
  );
}
