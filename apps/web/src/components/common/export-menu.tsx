"use client";

/**
 * Export menu.
 *
 * One component for every exportable thing, so a new format appears
 * everywhere at once and the wording stays consistent.
 */

import * as React from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { Button, cn } from "@podmind/ui";
import {
  downloadExport,
  EXPORT_FORMATS,
  type ExportFormat,
  type ExportKind,
} from "@/lib/api/exports";

export function ExportMenu({
  kind,
  id,
  className,
}: {
  kind: ExportKind;
  id: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<ExportFormat | null>(null);
  const [done, setDone] = React.useState<ExportFormat | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a menu that traps focus is worse
  // than no menu.
  React.useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    setError(null);
    try {
      await downloadExport(kind, id, format);
      setDone(format);
      setTimeout(() => setDone(null), 2000);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The export failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </Button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-primary-500/20 bg-card/95 p-1.5 shadow-soft backdrop-blur-[20px]"
        >
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              role="menuitem"
              disabled={busy !== null}
              onClick={() => void run(format.value)}
              className="flex w-full items-start gap-2 rounded px-2.5 py-2 text-left transition-colors hover:bg-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
            >
              <span className="flex-1">
                <span className="block text-sm">{format.label}</span>
                <span className="block text-xs text-muted-foreground">{format.hint}</span>
              </span>
              {busy === format.value ? (
                <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : null}
            </button>
          ))}

          {error ? (
            <p role="alert" className="px-2.5 py-1.5 text-xs text-error-400">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
