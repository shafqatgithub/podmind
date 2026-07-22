import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ScriptsWorkspace } from "@/components/scripts/scripts-workspace";

export const metadata: Metadata = { title: "Scripts" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Script Builder"
        description="Turn an outline into words you can read straight into the microphone."
      />
      <ScriptsWorkspace />
    </>
  );
}
