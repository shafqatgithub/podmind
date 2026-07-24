"use client";

/**
 * Error boundary for the public pages.
 *
 * The message stays generic on purpose: an error from the landing or a legal
 * page tells a visitor nothing useful, and a stack trace tells an attacker
 * something. The digest is shown because it is the one thing that makes a
 * support conversation possible.
 */

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@podmind/ui";
import { LogoLockup } from "@/components/brand/logo";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <LogoLockup markSize={30} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This page failed to load. Trying again usually fixes it.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs text-muted-foreground/70">Reference {error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="secondary">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
