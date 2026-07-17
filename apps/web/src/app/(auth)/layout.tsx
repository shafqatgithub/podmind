import Link from "next/link";
import { Mic2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <Mic2 className="h-6 w-6 text-primary-400" aria-hidden />
        <span className="text-xl font-semibold tracking-tight">PodMind AI</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
