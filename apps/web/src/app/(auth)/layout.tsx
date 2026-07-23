import Link from "next/link";
import { LogoFull } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4">
      {/* Aurora backdrop — this is the first screen a new user sees. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary-500/15 blur-[120px] motion-safe:animate-aurora" />
        <div className="absolute bottom-0 -right-32 h-[320px] w-[320px] rounded-full bg-purple-500/12 blur-[110px] motion-safe:animate-aurora [animation-delay:3s]" />
      </div>

      <Link
        href="/"
        className="mb-8 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <LogoFull width={220} />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
