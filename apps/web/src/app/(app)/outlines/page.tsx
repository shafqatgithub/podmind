import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { OutlinesWorkspace } from "@/components/outlines/outlines-workspace";

export const metadata: Metadata = { title: "Outlines" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Outline Builder"
        description="Turn a topic — or your research — into a running order you can record from."
      />
      {/* Suspense is required: the workspace reads ?open=<id>. */}
      <Suspense>
        <OutlinesWorkspace />
      </Suspense>
    </>
  );
}
