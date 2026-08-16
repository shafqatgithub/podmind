import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmSlot } from "@/components/calendar/confirm-slot";

export const metadata: Metadata = { title: "Confirm your recording" };

export default function Page() {
  return (
    // Outside the app shell on purpose: this is opened from an email, often
    // on a device that is not signed in.
    <Suspense>
      <ConfirmSlot />
    </Suspense>
  );
}
