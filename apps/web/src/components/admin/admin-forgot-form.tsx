"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button, Card, CardContent, Input, Label } from "@podmind/ui";
import { LogoMark } from "@/components/brand/logo";
import { createClient } from "@/lib/supabase/client";

/**
 * Admin password reset — code based.
 *
 * The project's email templates send a numeric code rather than a magic link,
 * so recovery is a two-step flow on one screen: request a code, then enter the
 * code together with the new password. verifyOtp(type: "recovery") establishes
 * the recovery session, after which the password can be updated.
 */
export function AdminForgotForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = React.useState<"request" | "verify">("request");
  const [email, setEmail] = React.useState(params.get("email") ?? "");
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet.");
        return;
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setNotice("We emailed a 6-digit code. Enter it below with your new password.");
      setStep("verify");
    } finally {
      setPending(false);
    }
  };

  const verifyAndSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
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
      const { error: otpError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "recovery",
      });
      if (otpError) {
        setError("That code is invalid or expired. Request a new one.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
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
            <h1 className="font-display text-xl font-semibold">Reset admin password</h1>
            <p className="text-sm text-muted-foreground">
              {step === "request"
                ? "We'll email a 6-digit code to your admin address."
                : "Enter the code from your email and choose a new password."}
            </p>
          </div>

          {notice ? (
            <p className="rounded-md border border-primary-500/30 bg-primary-500/5 px-3 py-2 text-sm text-primary-200">
              {notice}
            </p>
          ) : null}

          {step === "request" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-4">
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
                Send code
              </Button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("verify");
                }}
                className="text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Already have a code? Enter it
              </button>
              <Link
                href="/admin/login"
                className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> Back to sign in
              </Link>
            </form>
          ) : (
            <form onSubmit={verifyAndSet} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-v">Email</Label>
                <Input
                  id="email-v"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
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
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep("request");
                }}
                className="text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Send a new code
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
