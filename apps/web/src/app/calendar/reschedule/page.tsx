import type { Metadata } from "next";
import { Suspense } from "react";
import { RescheduleSlot } from "@/components/calendar/reschedule-slot";

export const metadata: Metadata = { title: "Move your recording" };

export default function Page() {
  return (
    <Suspense>
      <RescheduleSlot />
    </Suspense>
  );
}
