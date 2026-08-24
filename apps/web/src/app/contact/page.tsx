import type { Metadata } from "next";
import Link from "next/link";
import { LogoLockup } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach the team behind PodMind AI.",
};

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">
      <Link
        href="/"
        className="mb-10 self-start rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <LogoLockup markSize={28} priority />
      </Link>

      <h1 className="font-display text-3xl font-bold tracking-tight">Contact us</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Questions about your account, billing or the product? Reach us directly — a real person
        replies.
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Support &amp; billing</h2>
          <p>
            Email{" "}
            <a
              href="mailto:podmindai.com@gmail.com"
              className="text-primary-400 hover:text-primary-300"
            >
              podmindai.com@gmail.com
            </a>{" "}
            from the address on your account. We aim to reply within 2 business days. For refund
            requests, see our{" "}
            <Link href="/refunds" className="text-primary-400 hover:text-primary-300">
              Refund Policy
            </Link>
            .
          </p>
          <p>
            Phone:{" "}
            <a href="tel:+923055815238" className="text-primary-400 hover:text-primary-300">
              +92 305 5815238
            </a>
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold">Business details</h2>
          <p>
            PodMind AI is operated by <strong>Muhammad Shafqat Ali</strong>, a sole proprietor
            trading as PodMind AI.
          </p>
          <address className="not-italic text-muted-foreground">
            Balouch Colony, Goheer Town
            <br />
            Bahawalpur 63400
            <br />
            Punjab, Pakistan
          </address>
          <p className="text-muted-foreground">
            Payments and invoicing are handled by our merchant of record, Paddle
            (Paddle.com Market Ltd).
          </p>
        </section>
      </div>

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
