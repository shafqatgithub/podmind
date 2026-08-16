import type { Metadata } from "next";
import { Suspense } from "react";
import { AcceptInvite } from "@/components/settings/accept-invite";

export const metadata: Metadata = { title: "Join an organization" };

export default function Page() {
  // Inside (app) so the auth guard applies: an invitation is bound to one
  // email, and checking that needs a signed-in identity to compare against.
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}
