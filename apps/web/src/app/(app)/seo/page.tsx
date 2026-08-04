import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { SeoWorkspace } from "@/components/seo/seo-workspace";

export const metadata: Metadata = { title: "SEO" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="SEO Engine"
        description="Titles, descriptions, keywords and chapters that help people find the episode."
      />
      {/* Suspense is required: the workspace reads ?open=<id>. */}
      <Suspense>
        <SeoWorkspace />
      </Suspense>
    </>
  );
}
