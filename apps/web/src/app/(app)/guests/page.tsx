import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

export const metadata: Metadata = { title: "Guests" };

export default function Page() {
  return (
    <>
      <PageHeader title="Guests" description="Find and manage expert guests." />
      <EmptyState icon={Users} title="No guests yet" description="Discover experts for your episodes with bios, talking points and generated interview questions." />
    </>
  );
}
