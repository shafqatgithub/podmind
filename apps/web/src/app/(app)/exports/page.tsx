import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ExportsWorkspace } from "@/components/exports/exports-workspace";

export const metadata: Metadata = { title: "Export Center" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Export Center"
        description="Everything you've made, ready to download in any format or language."
      />
      <ExportsWorkspace />
    </>
  );
}
