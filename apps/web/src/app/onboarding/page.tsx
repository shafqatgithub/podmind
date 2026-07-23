import type { Metadata } from "next";
import { OnboardingWorkspace } from "@/components/onboarding/onboarding-workspace";

export const metadata: Metadata = { title: "Set up your workspace" };

export default function Page() {
  return <OnboardingWorkspace />;
}
