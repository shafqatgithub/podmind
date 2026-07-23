import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" description="Your profile, defaults and workspace." />
      <SettingsWorkspace />
    </>
  );
}
