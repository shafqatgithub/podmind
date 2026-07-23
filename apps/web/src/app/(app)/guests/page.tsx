import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { GuestsWorkspace } from "@/components/guests/guests-workspace";

export const metadata: Metadata = { title: "Guests" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Guest Intelligence"
        description="Walk into every interview prepared — background, questions and what to verify."
      />
      <GuestsWorkspace />
    </>
  );
}
