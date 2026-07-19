"use client";

/**
 * @podmind/ui primitives.
 * Every component: forwardRef, semantic tokens only (no raw colors),
 * visible focus ring, disabled states, cva variants.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/* ----------------------------------------------------------- Button */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded font-medium",
    "transition-colors focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary-500 text-white hover:bg-primary-600 hover:shadow-glow-blue active:bg-primary-700",
        secondary: "bg-transparent text-foreground border border-purple-500 hover:bg-purple-500/15 active:bg-purple-500/25",
        ghost: "text-foreground hover:bg-hover active:bg-active",
        destructive: "bg-error-600 text-neutral-50 hover:bg-error-500 active:bg-error-700",
        outline: "border border-border bg-transparent text-foreground hover:bg-hover",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Shows a spinner and disables interaction. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ------------------------------------------------------------- Card */

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-primary-500/20 bg-card/80 text-foreground shadow-soft backdrop-blur-[20px]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-none", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

/* ------------------------------------------------------------ Input */

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-error-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

/* ------------------------------------------------------------ Label */

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      ref={ref}
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

/* ------------------------------------------------------------ Badge */

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary-600/15 text-primary-300",
        success: "bg-success-600/15 text-success-400",
        warning: "bg-warning-600/15 text-warning-400",
        error: "bg-error-600/15 text-error-400",
        neutral: "bg-neutral-700/40 text-neutral-300",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/* --------------------------------------------------------- Skeleton */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-hover", className)}
      {...props}
    />
  );
}

/* ---------------------------------------------------------- Spinner */

export function Spinner({ className, ...props }: React.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      className={cn("animate-spin", className)}
      {...props}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

const FIELD_BASE = cn(
  "flex w-full rounded border border-border bg-input px-3 py-2 text-sm text-foreground",
  "placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "aria-[invalid=true]:border-error-500",
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, rows = 3, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(FIELD_BASE, "resize-y", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(FIELD_BASE, "h-10 cursor-pointer pr-8", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
