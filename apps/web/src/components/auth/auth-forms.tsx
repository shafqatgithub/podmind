"use client";

/**
 * Auth forms — documented methods (12-User-Flows): Email, Google, GitHub.
 * useActionState drives pending/error/message states; OAuth starts here and
 * completes in /auth/callback.
 */

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@podmind/ui";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthActionState,
} from "@/lib/auth/actions";

const INITIAL: AuthActionState = { error: null, message: null };

function StatusText({ state }: { state: AuthActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-error-400">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="text-sm text-success-400">
        {state.message}
      </p>
    );
  }
  return null;
}

function OAuthButtons() {
  const [pending, setPending] = React.useState<"google" | "github" | null>(null);
  const [oauthError, setOauthError] = React.useState<string | null>(null);

  const signInWith = async (provider: "google" | "github") => {
    const supabase = createClient();
    if (!supabase) {
      setOauthError("Authentication is not configured yet.");
      return;
    }
    setOauthError(null);
    setPending(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setPending(null);
      const label = provider === "google" ? "Google" : "GitHub";
      setOauthError(
        `${label} sign-in is not enabled yet — use email, or ask the workspace owner to enable it in Supabase.`,
      );
    }
  };

  return (
    <div className="flex flex-col gap-2">
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="secondary"
        loading={pending === "google"}
        onClick={() => void signInWith("google")}
      >
        Google
      </Button>
      <Button
        type="button"
        variant="secondary"
        loading={pending === "github"}
        onClick={() => void signInWith("github")}
      >
        GitHub
      </Button>
    </div>
    {oauthError ? (
      <p role="alert" className="text-sm text-error-400">
        {oauthError}
      </p>
    ) : null}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      or continue with email
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState(signInAction, INITIAL);
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const urlError = params.get("error");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OAuthButtons />
        <Divider />
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {urlError && !state.error ? (
            <p role="alert" className="text-sm text-error-400">
              That verification link was already used or expired. If your account is verified, just sign in below.
            </p>
          ) : null}
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Sign in
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          New to PodMind?{" "}
          <Link href="/signup" className="text-primary-400 hover:text-primary-300">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <OAuthButtons />
        <Divider />
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" name="full_name" autoComplete="name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending} disabled={Boolean(state.message)}>
            Sign up
          </Button>
          {/* Stated at the point of agreement rather than buried in a footer,
              so consent is informed and the record of it is meaningful. */}
          <p className="text-center text-xs text-muted-foreground">
            By creating an account you agree to our{" "}
            <Link href="/terms" className="text-primary-400 hover:text-primary-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary-400 hover:text-primary-300">
              Privacy Policy
            </Link>
            .
          </p>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-400 hover:text-primary-300">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending} disabled={Boolean(state.message)}>
            Send reset link
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary-400 hover:text-primary-300">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
