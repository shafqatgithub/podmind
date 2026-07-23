import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ApiKeysWorkspace } from "@/components/api-keys/api-keys-workspace";

export const metadata: Metadata = { title: "API Keys" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="API Keys"
        description="Call the PodMind API from your own scripts and integrations."
      />
      <ApiKeysWorkspace />
    </>
  );
}
