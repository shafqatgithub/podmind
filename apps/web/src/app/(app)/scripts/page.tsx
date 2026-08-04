import type { Metadata } from "next";
import { Suspense } from "react";
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
      {/* Suspense is required: the workspace reads ?open=<id>. */}
      <Suspense>
        <ScriptsWorkspace />
      </Suspense>
    </>
  );
}
