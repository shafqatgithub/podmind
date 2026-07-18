"use client";

import { MotionProvider, PageTransition } from "@/components/motion/motion";

/** Route-change transition for every app section (re-mounts per navigation). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionProvider>
      <PageTransition>{children}</PageTransition>
    </MotionProvider>
  );
}
