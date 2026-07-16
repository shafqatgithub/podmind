import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Workspace and account preferences." />
      <EmptyState icon={Settings} title="Settings arrive with authentication" description="Profile, organization, AI provider and billing settings unlock in the authentication stage." />
    </>
  );
}
