import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { TopicsWorkspace } from "@/components/topics/topics-workspace";

export const metadata: Metadata = { title: "Topic Discovery" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Topic Discovery"
        description="What is worth an episode this week — from the live web, with sources."
      />
      <TopicsWorkspace />
    </>
  );
}
