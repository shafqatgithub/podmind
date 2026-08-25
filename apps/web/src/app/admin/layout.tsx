import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · PodMind Admin" },
  robots: { index: false, follow: false },
};

/**
 * The admin panel is its own application: a separate login and a chrome that
 * is deliberately unlike the customer app, so an operator always knows which
 * surface they are on. Route protection is handled in middleware.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
