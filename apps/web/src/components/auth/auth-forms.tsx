"use client";

/**
 * Auth forms — documented methods (12-User-Flows): Email, Google, GitHub.
 * useActionState drives pending/error/message states; OAuth starts here and
 * completes in /auth/callback.
 */

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@podmind/ui";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordAction,
  resendResetCodeAction,
  resendSignupCodeAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailCodeAction,
  verifyResetCodeAction,
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

/**
 * A password field with a reveal toggle.
 *
 * Typing a password blind is where most sign-up friction comes from — a
 * mistyped character is invisible, and on a phone keyboard it is common. The
 * toggle defaults to hidden, so nothing is exposed to someone glancing over a
 * shoulder unless the person asks for it.
 */
function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
  required,
  autoFocus,
}: {
  id: string;
  name: string;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        autoFocus={autoFocus}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Excluded from tab order: it sits between the password field and the
        // submit button, and stopping there on the way to submitting is a
        // small annoyance repeated on every sign-in.
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
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
            <PasswordInput
              id="password"
              name="password"
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
  const next = useSearchParams().get("next") ?? "/dashboard";

  if (state.codeSentTo) {
    return <VerifyEmailCodeForm email={state.codeSentTo} next={next} />;
  }

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
            <PasswordInput
              id="password"
              name="password"
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

/**
 * Shown after signup: the user enters the 6-digit code emailed to them.
 * Verifying the code confirms the account and signs them in (redirect to
 * /dashboard happens inside the server action).
 */
export function VerifyEmailCodeForm({ email, next }: { email: string; next?: string }) {
  const [state, action, pending] = useActionState(verifyEmailCodeAction, INITIAL);
  const [resendState, resendAction, resendPending] = useActionState(
    resendSignupCodeAction,
    INITIAL,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="text-foreground">{email}</span>. Enter it
        below to verify your account.
        </p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="token">Verification code</Label>
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              required
              autoFocus
            />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Verify email
          </Button>
        </form>
        <form action={resendAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="email" value={email} />
          <StatusText state={resendState} />
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
          >
            {resendPending ? "Sending..." : "Resend code"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Password reset in three steps on one screen: request a code by email,
 * verify the 6-digit code (type: recovery), then set the new password.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL);

  if (state.codeSentTo) {
    return <ResetWithCodeForm email={state.codeSentTo} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Enter your email and we&rsquo;ll send you a 6-digit code to reset your password.
        </p>
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Send code
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

function ResetWithCodeForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyResetCodeAction, INITIAL);
  const [resendState, resendAction, resendPending] = useActionState(
    resendResetCodeAction,
    INITIAL,
  );

  if (state.resetVerified) {
    return <NewPasswordForm />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your email</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          If <span className="text-foreground">{email}</span> has an account, we sent it a
          6-digit code. Enter it below to continue.
        </p>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="email" value={email} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="token">Reset code</Label>
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              className="text-center text-lg tracking-[0.5em]"
              required
              autoFocus
            />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Verify code
          </Button>
        </form>
        <form action={resendAction} className="flex flex-col items-center gap-1">
          <input type="hidden" name="email" value={email} />
          <StatusText state={resendState} />
          <button
            type="submit"
            disabled={resendPending}
            className="text-sm text-primary-400 hover:text-primary-300 disabled:opacity-50"
          >
            {resendPending ? "Sending..." : "Resend code"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

function NewPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <StatusText state={state} />
          <Button type="submit" loading={pending}>
            Reset password
          </Button>
        </form>
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
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              name="confirm"
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
