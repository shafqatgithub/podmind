"use client";

/**
 * Application shell — 13-Information-Architecture.md §21:
 * Primary navigation: Dashboard, Projects, Research, Guests, Scripts,
 * Knowledge, Analytics, Settings. Dark is the primary theme; the toggle
 * persists the user's choice (05-Design-System §4: "User can switch anytime").
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Mic2,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { Button, Skeleton, cn } from "@podmind/ui";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { LogOut, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/research", label: "Research", icon: Search },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/scripts", label: "Scripts", icon: FileText },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function ThemeToggle() {
  const [theme, setTheme] = React.useState<"dark" | "light">("dark");

  React.useEffect(() => {
    const stored = localStorage.getItem("podmind-theme");
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("podmind-theme", next);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export interface ShellUser {
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/** Client-side session: pages stay static; middleware guards the route. */
function useShellUser(): { user: ShellUser | null; loading: boolean } {
  const [user, setUser] = React.useState<ShellUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const map = (u: { email?: string; user_metadata: Record<string, unknown> } | null) =>
      u
        ? {
            email: u.email ?? "",
            name: (u.user_metadata.full_name as string | undefined) ?? null,
            avatarUrl: (u.user_metadata.avatar_url as string | undefined) ?? null,
          }
        : null;

    void supabase.auth.getUser().then(({ data }) => {
      setUser(map(data.user));
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(map(session?.user ?? null));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loading };
}

function UserMenu() {
  const { user, loading } = useShellUser();
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  if (loading) return <Skeleton className="h-8 w-8 rounded-full" />;
  if (!user) return null;

  const initial = (user.name ?? user.email).charAt(0).toUpperCase();
  const signOut = async () => {
    setSigningOut(true);
    await createClient()?.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{user.name ?? "Podcaster"}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-border" />
      ) : (
        <div
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600/20 text-sm font-semibold text-primary-300"
        >
          {initial}
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        loading={signingOut}
        onClick={() => void signOut()}
      >
        {!signingOut && <LogOut className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-border bg-surface md:flex">
        <Link href="/" className="flex items-center gap-2 px-5 py-5">
          <Mic2 className="h-5 w-5 text-primary-400" aria-hidden />
          <span className="font-semibold tracking-tight">PodMind AI</span>
        </Link>

        <LazyMotion features={domAnimation} strict>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  active
                    ? "text-primary-300"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                {active && (
                  <m.span
                    layoutId="nav-active"
                    aria-hidden
                    className="absolute inset-0 rounded bg-primary-600/15"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" aria-hidden />
                <span className="relative z-10">{label}</span>
              </Link>
            );
          })}
        </nav>
        </LazyMotion>

        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          PodMind AI
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface/60 px-6 backdrop-blur">
          {/* Mobile brand (sidebar hidden on small screens) */}
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <Mic2 className="h-5 w-5 text-primary-400" aria-hidden />
            <span className="font-semibold">PodMind</span>
          </Link>
          <div className="flex flex-1 items-center justify-end gap-4">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
