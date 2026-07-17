import { AppShell } from "@/components/shell/app-shell";

/**
 * Route protection lives in middleware (edge). Pages stay static —
 * zero serverless functions; the shell hydrates the user client-side.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
