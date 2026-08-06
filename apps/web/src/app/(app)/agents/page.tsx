import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { AgentsWorkspace } from "@/components/agents/agents-workspace";

export const metadata: Metadata = { title: "Episode Pipeline" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Episode Pipeline"
        description="One topic in, a full episode package out — research, outline, script, SEO and social."
      />
      {/* Suspense is required: the workspace reads search params. */}
      <Suspense>
        <AgentsWorkspace />
      </Suspense>
    </>
  );
}
