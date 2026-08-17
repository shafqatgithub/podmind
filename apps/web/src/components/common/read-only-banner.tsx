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
import { Eye } from "lucide-react";
import { organizationApi } from "@/lib/api/organization";
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

  if (role !== "viewer") return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/25 bg-amber-500/5 px-4 py-2 sm:px-6">
      <Eye className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <p className="text-xs leading-snug text-amber-200">
        You have view-only access to this organization. You can read everything, but changes
        are turned off — ask an owner or admin if you need to create or edit.
      </p>
    </div>
  );
}
