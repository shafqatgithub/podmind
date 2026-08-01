import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <>
      <PageHeader title="Projects" description="Every episode starts as a project." />
      {/* Suspense is required: the workspace reads ?open=<id> via useSearchParams. */}
      <Suspense>
        <ProjectsWorkspace />
      </Suspense>
    </>
  );
}
