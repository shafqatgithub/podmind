import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { BillingWorkspace } from "@/components/billing/billing-workspace";

export const metadata: Metadata = { title: "Billing" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Billing"
        description="Your plan, credits and invoices."
      />
      <BillingWorkspace />
    </>
  );
}
