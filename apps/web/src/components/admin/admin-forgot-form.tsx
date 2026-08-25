"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { LogoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin password reset — request step. Sends a recovery email whose link
 * lands the operator on the admin reset page (routed through /auth/confirm so
 * the recovery session is established the same proven way the rest of the app
 * uses).
 */
export function AdminForgotForm() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/admin/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-brand-gradient p-[1.5px] shadow-glow-blue">
              <div className="flex size-16 items-center justify-center rounded-full bg-card">
                <LogoMark size={40} priority />
              </div>
            </div>
            <h1 className="font-display text-xl font-semibold">Reset admin password</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ll email a link to set a new password.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <MailCheck className="size-8 text-primary-300" aria-hidden />
              <p className="text-sm text-muted-foreground">
                If an admin account uses that email, a reset link is on its way. Open it on this
                device to continue.
              </p>
              <Link
                href="/admin/login"
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-sm text-error-400">
                  {error}
                </p>
              ) : null}
              <Button type="submit" loading={pending}>
                Send reset link
              </Button>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
