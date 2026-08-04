import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { SocialWorkspace } from "@/components/social/social-workspace";

export const metadata: Metadata = { title: "Social" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Social Media Engine"
        description="Posts written for each platform on its own terms — not one draft reworded."
      />
      {/* Suspense is required: the workspace reads ?open=<id>. */}
      <Suspense>
        <SocialWorkspace />
      </Suspense>
    </>
  );
}
