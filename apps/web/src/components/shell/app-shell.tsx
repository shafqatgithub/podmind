"use client";

/**
 * Application shell — 13-Information-Architecture.md §21:
 * Primary navigation follows the documented order, extended as modules
 * shipped: Dashboard, Projects, Research, Outlines, Guests, Scripts,
 * Fact Checker, AI Chat, Knowledge, Analytics, Settings. Dark is the primary theme; the toggle
 * persists the user's choice (05-Design-System §4: "User can switch anytime").
 */

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Compass,
  CreditCard,
  Crown,
  Brain,
  FileText,
  FolderKanban,
  KeyRound,
  LayoutDashboard,
  Menu,
  Moon,
  ScanSearch,
  Search,
  Settings,
  Share2,
  Sun,
  TrendingUp,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Button, Skeleton, cn } from "@podmind/ui";
import { m, LazyMotion, domAnimation } from "framer-motion";
import { ListOrdered, LogOut, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogoLockup, LogoMark } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";

/**
 * Navigation is grouped rather than flat: seventeen equal-weight links is a
 * list to scan, not a menu to use. The groups follow what someone is trying
 * to do — make something, manage the workspace, or handle the account.
 */
const NAV_GROUPS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "AI Tools",
    items: [
      { href: "/topics", label: "Topic Discovery", icon: Compass, badge: "NEW" },
      { href: "/agents", label: "Episode Pipeline", icon: Workflow },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/chat", label: "AI Chat", icon: MessageSquare },
      { href: "/research", label: "AI Research", icon: Search },
      { href: "/outlines", label: "Outlines", icon: ListOrdered },
      { href: "/scripts", label: "Scripts", icon: FileText },
      { href: "/guests", label: "Guest Assistant", icon: Users },
      { href: "/fact-checks", label: "Fact Checker", icon: ScanSearch },
      { href: "/seo", label: "SEO Engine", icon: TrendingUp },
      { href: "/social", label: "Social Posts", icon: Share2 },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
      { href: "/memory", label: "AI Memory", icon: Brain },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/api-keys", label: "API Keys", icon: KeyRound },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
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
          className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-glow-blue"
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

/** Search field with the keyboard hint, as in the design. */
function SearchBar() {
  const router = useRouter();
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        const query = String(q ?? "").trim();
        // Projects is the one place that searches across the workspace today,
        // so the bar goes there rather than to a results page that would have
        // nothing behind it.
        if (query) router.push(`/projects?search=${encodeURIComponent(query)}`);
      }}
      className="relative hidden max-w-md flex-1 sm:block"
    >
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={ref}
        name="q"
        type="search"
        placeholder="Search projects, chats, docs..."
        aria-label="Search"
        className="h-10 w-full rounded-full border border-border bg-surface/60 pl-10 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
      >
        ⌘K
      </kbd>
    </form>
  );
}

/** Upgrade card pinned to the foot of the sidebar. */
function UpgradeCard() {
  return (
    <div className="m-3 rounded-lg border border-primary-500/25 bg-gradient-to-br from-primary-500/10 to-purple-500/10 p-4">
      <p className="flex items-center gap-2 font-display text-sm font-semibold">
        <Crown className="h-4 w-4 text-warning-400" aria-hidden />
        Upgrade to Pro
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Unlimited AI, premium models and advanced features.
      </p>
      <Link
        href="/billing"
        className="mt-3 flex h-9 w-full items-center justify-center rounded bg-brand-gradient text-sm font-semibold text-white shadow-glow-blue transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        Upgrade Now
      </Link>
    </div>
  );
}

/**
 * Mobile navigation.
 *
 * The sidebar is hidden below md, so without this there is no way to reach
 * any page on a phone — the app simply ends at whatever screen you landed on.
 * A drawer keeps the same grouped nav rather than shipping a second, shorter
 * menu that would quietly hide half the product on mobile.
 */
function MobileNav({ pathname }: { pathname: string }) {
  const [open, setOpen] = React.useState(false);
  // document only exists after mount, so the portal waits for it.
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Route changes close the drawer; without this it stays open over the page
  // the user just navigated to.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes it, and the body is locked so the page behind cannot scroll
  // under the overlay.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {/*
        Portalled to the body on purpose. This button lives inside the header,
        which carries backdrop-blur — and backdrop-filter makes an ancestor a
        containing block for position:fixed descendants. Rendered in place, the
        drawer was trapped inside the 64px header box and painted on top of the
        page instead of covering it.
      */}
      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-background/80 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-primary-500/15 bg-surface shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <LogoLockup markSize={26} />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <SidebarNav pathname={pathname} />
            <UpgradeCard />
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function SidebarNav({ pathname }: { pathname: string }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label ?? "root"} className="flex flex-col gap-1">
            {group.label ? (
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
            ) : null}

            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const badge = "badge" in item ? (item.badge as string) : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    active
                      ? "text-white"
                      : "text-muted-foreground hover:bg-hover hover:text-foreground",
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="nav-active"
                      aria-hidden
                      className={cn(
                        "absolute inset-0 rounded-lg",
                        // The dashboard entry sits alone above the groups and
                        // reads as the home row, so it gets the fuller
                        // treatment; the rest use a subtler tint so a long
                        // sidebar does not glow at the user all day.
                        groupIndex === 0
                          ? "bg-brand-gradient opacity-90 shadow-glow-blue"
                          : "bg-primary-500/15 ring-1 ring-inset ring-primary-500/30",
                      )}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "relative z-10 h-4 w-4 shrink-0",
                      active && groupIndex !== 0 && "text-primary-300",
                    )}
                    aria-hidden
                  />
                  <span className="relative z-10 truncate">{item.label}</span>
                  {badge ? (
                    <span className="relative z-10 ml-auto rounded bg-primary-500/20 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-primary-300">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </LazyMotion>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen">
      {/*
        Aurora backdrop, deliberately far quieter than the landing page.
        The landing is looked at for thirty seconds; this is a work surface
        someone sits in for hours, so the brand should be felt at the edges
        rather than competing with their content.
      */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/4 h-[420px] w-[620px] -translate-x-1/2 rounded-full bg-primary-500/[0.07] blur-[130px] motion-safe:animate-aurora" />
        <div className="absolute top-1/3 -right-40 h-[380px] w-[380px] rounded-full bg-purple-500/[0.06] blur-[120px] motion-safe:animate-aurora [animation-delay:3s]" />
        <div className="absolute -bottom-40 left-0 h-[340px] w-[340px] rounded-full bg-cyan-400/[0.05] blur-[110px] motion-safe:animate-aurora [animation-delay:6s]" />
      </div>

      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-primary-500/15 bg-gradient-to-b from-surface via-surface to-background/80 backdrop-blur-xl md:flex">
        <Link
          href="/dashboard"
          className="flex items-center px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <LogoLockup priority />
        </Link>

        <SidebarNav pathname={pathname} />
        <UpgradeCard />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-primary-500/15 bg-surface/70 px-4 backdrop-blur-xl sm:gap-4 sm:px-6">
          <MobileNav pathname={pathname} />
          <Link
            href="/dashboard"
            className="flex items-center md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <LogoMark size={28} priority />
          </Link>

          <SearchBar />

          <div className="flex flex-1 items-center justify-end gap-3">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
