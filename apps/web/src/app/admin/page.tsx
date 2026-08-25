"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@podmind/ui";
import { createClient } from "@/lib/supabase/client";
import { AdminWorkspace } from "@/components/admin/admin-workspace";

/**
 * Admin home. Middleware guarantees a session before this renders; the
 * workspace itself refuses non-admins (the API returns forbidden and the UI
 * shows "not available"). Sign-out returns to the admin login, not the
 * customer one.
 */
export default function AdminPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = React.useState(false);

  const signOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary-300" aria-hidden />
          <div>
            <h1 className="font-display text-lg font-semibold leading-none">PodMind Admin</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Platform operations — every organization, user and credit.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" loading={signingOut} onClick={() => void signOut()}>
          <LogOut className="mr-1 size-3.5" /> Sign out
        </Button>
      </header>

      <AdminWorkspace />
    </div>
  );
}
