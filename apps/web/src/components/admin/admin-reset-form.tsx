"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { LogoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin password reset — set step. Reached from the recovery email, by which
 * point /auth/confirm has established a recovery session, so this only has to
 * collect the new password and update the account.
 */
export function AdminResetForm() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(
          "This reset link has expired or was already used. Request a new one from the sign-in page.",
        );
        return;
      }
      router.replace("/admin");
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
            <h1 className="font-display text-xl font-semibold">Set a new password</h1>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-error-400">
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={pending}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
