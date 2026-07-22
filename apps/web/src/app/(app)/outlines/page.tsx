import type { Metadata } from "next";
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
      <OutlinesWorkspace />
    </>
  );
}
