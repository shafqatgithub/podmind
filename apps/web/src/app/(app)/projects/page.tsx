import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <>
      <PageHeader title="Projects" description="Every episode starts as a project." />
      <ProjectsWorkspace />
    </>
  );
}
