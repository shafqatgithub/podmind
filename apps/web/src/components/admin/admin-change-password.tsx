"use client";

import * as React from "react";
import { KeyRound, X } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { createClient } from "@/lib/supabase/client";

/**
 * Change password from inside the panel. The admin is already signed in, so
 * this updates the account directly — no email round-trip needed.
 */
export function AdminChangePassword() {
  const [open, setOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const reset = () => {
    setPassword("");
    setConfirm("");
    setError(null);
    setDone(false);
  };

  const submit = async (e: React.FormEvent) => {
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
        setError(updateError.message);
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <KeyRound className="mr-1 size-3.5" /> Password
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <Card className="relative w-full max-w-sm">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Change password</h2>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="size-4" />
                </Button>
              </div>

              {done ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-success-400">Password updated.</p>
                  <Button size="sm" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-pass">New password</Label>
                    <Input
                      id="new-pass"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirm-pass">Confirm password</Label>
                    <Input
                      id="confirm-pass"
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
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
