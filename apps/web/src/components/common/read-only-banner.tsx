"use client";

/**
 * Tells a view-only member that they are view-only.
 *
 * The server refuses their writes, which is correct but arrives too late: by
 * then they have filled in a form and pressed a button. This says so up
 * front, once, at the top of every page — a single quiet line rather than a
 * disabled control on every form, which would mean touching forty components
 * and still missing some.
 *
 * Only viewers see it. Everyone else gets nothing, and the fetch costs one
 * small request per session.
 */

import * as React from "react";
import { Eye, UserCheck } from "lucide-react";
import { organizationApi } from "@/lib/api/organization";
import { cn } from "@podmind/ui";
import { isApiConfigured } from "@/lib/api/client";

export function ReadOnlyBanner() {
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isApiConfigured()) return;
    const controller = new AbortController();
    void organizationApi
      .me(controller.signal)
      .then((me) => setRole(me.role))
      // Silent: a banner that could not load is not worth an error, and the
      // server still enforces the rule either way.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  // Owners, admins and managers work without limits and need no notice.
  if (role !== "viewer" && role !== "member") return null;

  const viewer = role === "viewer";

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b px-4 py-2 sm:px-6",
        viewer ? "border-amber-500/25 bg-amber-500/5" : "border-border/60 bg-hover/30",
      )}
    >
      {viewer ? (
        <Eye className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      ) : (
        <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <p className={cn("text-xs leading-snug", viewer ? "text-amber-200" : "text-muted-foreground")}>
        {viewer
          ? "You have view-only access to this organization. You can read everything, but changes are turned off — ask an owner or admin if you need to create or edit."
          : "You're a member here: you can create freely and edit your own work. Changing a colleague's work needs a manager, admin or owner."}
      </p>
    </div>
  );
}
