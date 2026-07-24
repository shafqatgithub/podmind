import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace";

export const metadata: Metadata = { title: "Calendar" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Content Calendar"
        description="Plan the month, then run each episode from its slot."
      />
      <CalendarWorkspace />
    </>
  );
}
