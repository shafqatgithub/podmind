"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { createClient } from "@/lib/supabase/client";
import { adminApi } from "@/lib/api/admin";

/**
 * Admin sign-in — separate from the customer login on purpose.
 *
 * A correct password is not enough: after authenticating we confirm the
 * account is actually an administrator, and sign non-admins straight back out.
 * The panel behind this door reads across every tenant, so the door checks who
 * is knocking rather than trusting that they found the URL.
 */
export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("Wrong email or password.");
        return;
      }
      // Authenticated — but is this account an administrator?
      try {
        const me = await adminApi.me();
        if (!me) {
          await supabase.auth.signOut();
          setError("This account does not have administrator access.");
          return;
        }
      } catch {
        await supabase.auth.signOut();
        setError("This account does not have administrator access.");
        return;
      }
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
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
              <div className="rounded-full bg-card p-3">
                <ShieldCheck className="size-6 text-primary-300" aria-hidden />
              </div>
            </div>
            <h1 className="font-display text-xl font-semibold">PodMind Admin</h1>
            <p className="text-sm text-muted-foreground">
              Operator access. Administrator accounts only.
            </p>
          </div>

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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-error-400">
                {error}
              </p>
            ) : null}
            <Button type="submit" loading={pending}>
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
