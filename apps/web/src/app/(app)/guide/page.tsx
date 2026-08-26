import type { Metadata } from "next";
import { GuideWorkspace } from "@/components/guide/guide-workspace";

export const metadata: Metadata = { title: "User Guide" };

export default function Page() {
  return <GuideWorkspace />;
}
