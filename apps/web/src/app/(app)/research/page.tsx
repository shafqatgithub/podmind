import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { ResearchWorkspace } from "@/components/research/research-workspace";

export const metadata: Metadata = { title: "Research" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="AI Research Engine"
        description="Turn a topic into an episode-ready briefing — facts, statistics, angles and sources."
      />
      {/* Suspense is required: the workspace reads ?open=<id>. */}
      <Suspense>
        <ResearchWorkspace />
      </Suspense>
    </>
  );
}
