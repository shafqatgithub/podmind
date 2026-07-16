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
import { Button, cn } from "@podmind/ui";

const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/research", label: "Research", icon: Search },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/scripts", label: "Scripts", icon: FileText },
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

        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 py-2">
          {PRIMARY_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  active
                    ? "bg-primary-600/15 text-primary-300"
                    : "text-muted-foreground hover:bg-hover hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
          Stage 3 · Frontend foundation
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
          <div className="flex flex-1 items-center justify-end gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
