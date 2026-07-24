import type { ReactNode } from "react";
import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo";

/**
 * Layout for the legal pages.
 *
 * Deliberately plain: these documents are read to find one specific answer,
 * usually under time pressure, so the page gets out of the way. No aurora, no
 * animation — just the brand at the top and readable measure below.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <Link
        href="/"
        className="mb-10 self-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <LogoLockup markSize={28} priority />
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed">{children}</div>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/refunds" className="hover:text-foreground">
            Refund Policy
          </Link>
        </div>
      </footer>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">{heading}</h2>
      {children}
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * Marks a value the operator must replace before publishing. Rendered
 * visibly rather than as a comment, so an unfinished document cannot be
 * shipped without someone noticing.
 */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-warning-500/20 px-1 text-warning-200">[{children}]</mark>
  );
}
