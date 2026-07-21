import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export const metadata: Metadata = { title: "AI Chat" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="AI Chat"
        description="A project-aware assistant that remembers your show and its research."
      />
      <ChatWorkspace />
    </>
  );
}
