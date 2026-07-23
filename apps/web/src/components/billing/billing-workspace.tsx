"use client";

/**
 * Billing workspace.
 *
 * Checkout needs a payment provider that is not configured yet, so the page
 * tells the truth about that instead of rendering an Upgrade button that
 * leads nowhere. Everything that genuinely works — plan comparison, real
 * credit balance, the ledger showing where credits went — is fully live.
 */

import * as React from "react";
import { Check, CreditCard, ExternalLink, Info, Receipt } from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@podmind/ui";
import { ApiError, isApiConfigured } from "@/lib/api/client";
import { billingApi, type BillingOverview, type Plan } from "@/lib/api/billing";
import { EmptyState } from "@/components/common/empty-state";
import { openCheckout } from "@/lib/paddle";
import { Item, Reveal } from "@/components/motion/motion";

function money(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  const value = Number(amount);
  if (value === 0) return "Free";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function planFeatures(plan: Plan): string[] {
  const list: string[] = [];
  if (plan.ai_credits) list.push(`${plan.ai_credits.toLocaleString()} AI credits / month`);
  if (plan.max_projects) {
    list.push(plan.max_projects < 0 ? "Unlimited projects" : `${plan.max_projects} projects`);
  }
  if (plan.max_team_members) {
    list.push(
      plan.max_team_members < 0
        ? "Unlimited team members"
        : `${plan.max_team_members} team member${plan.max_team_members === 1 ? "" : "s"}`,
    );
  }
  if (plan.max_storage_gb) list.push(`${plan.max_storage_gb} GB storage`);

  if (Array.isArray(plan.features)) {
    for (const f of plan.features) if (typeof f === "string") list.push(f);
  }
  return list;
}

function PlanCard({
  plan,
  current,
  paymentsEnabled,
  organizationId,
}: {
  plan: Plan;
  current: boolean;
  paymentsEnabled: boolean;
  organizationId: string | null;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // A plan is only purchasable once it has been mapped to a Paddle price and
  // we know who is buying; otherwise the button would open an empty checkout.
  const priceId = plan.paddle_price_id_monthly;
  const purchasable = Boolean(priceId && organizationId);

  return (
    <Card className={cn("h-full", current && "border-primary-500/60 shadow-glow-blue")}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold">{plan.name}</h3>
          {current ? (
            <Badge className="bg-primary-500/15 text-primary-300">Current</Badge>
          ) : null}
        </div>

        <div>
          <span className="font-display text-2xl font-bold">
            {money(plan.monthly_price, plan.currency)}
          </span>
          {plan.monthly_price && Number(plan.monthly_price) > 0 ? (
            <span className="text-sm text-muted-foreground"> / month</span>
          ) : null}
        </div>

        {plan.description ? (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        ) : null}

        <ul className="flex flex-col gap-1.5">
          {planFeatures(plan).map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-400" aria-hidden />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          {current ? (
            <Button variant="secondary" disabled className="w-full">
              Your plan
            </Button>
          ) : paymentsEnabled && purchasable && priceId && organizationId ? (
            <Button
              className="w-full"
              loading={busy}
              onClick={() => {
                setBusy(true);
                setError(null);
                openCheckout({ priceId, organizationId })
                  .catch(() =>
                    setError("Could not open checkout. Please try again."),
                  )
                  // Paddle takes over the screen from here; the webhook is
                  // what actually applies the plan, so nothing is assumed.
                  .finally(() => setBusy(false));
              }}
            >
              Choose {plan.name}
            </Button>
          ) : (
            <Button variant="secondary" disabled className="w-full">
              Not available yet
            </Button>
          )}
          {error ? (
            <p role="alert" className="mt-2 text-xs text-error-400">
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function BillingWorkspace() {
  const [data, setData] = React.useState<BillingOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setData(await billingApi.overview(controller.signal));
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof ApiError && err.isUnreachable
            ? "The PodMind API is not reachable right now."
            : "Could not load your billing information.",
        );
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  if (!isApiConfigured()) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Backend not connected yet"
        description="Set NEXT_PUBLIC_API_URL to your deployed PodMind API to see your plan and usage."
      />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p role="alert" className="text-sm text-error-400">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { credits, subscription, plans, invoices, transactions } = data;
  const total = Number(credits.available_credits) + Number(credits.used_credits);
  const usedPct = total > 0 ? Math.round((Number(credits.used_credits) / total) * 100) : 0;

  return (
    <Reveal className="flex flex-col gap-6">
      {/* Current plan and credits */}
      <Item>
        <Card>
          <CardContent className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-semibold">
                {subscription ? subscription.plan_name : "Free plan"}
              </h2>
              {subscription ? (
                <Badge className="capitalize">{subscription.status}</Badge>
              ) : (
                <Badge className="bg-neutral-500/15 text-neutral-300">No subscription</Badge>
              )}
              {subscription?.current_period_end ? (
                <span className="text-sm text-muted-foreground">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">AI credits</span>
                <span className="font-display text-lg font-bold">
                  {Number(credits.available_credits).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    of {total.toLocaleString()} left
                  </span>
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-hover"
                role="progressbar"
                aria-valuenow={usedPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Credits used"
              >
                <div
                  className="h-full rounded-full bg-brand-gradient transition-[width]"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {Number(credits.used_credits).toLocaleString()} used so far
              </p>
            </div>
          </CardContent>
        </Card>
      </Item>

      {/* Honest state about checkout */}
      {!data.payments_enabled ? (
        <Item>
          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-400" aria-hidden />
              <div className="text-sm">
                <p className="font-medium">Paid plans are not available yet.</p>
                <p className="mt-1 text-muted-foreground">
                  Checkout needs a payment provider to be connected to the backend. Everything
                  below is live — the plans are real and your credit usage is accurate — but
                  upgrading will stay disabled until payments are set up.
                </p>
              </div>
            </CardContent>
          </Card>
        </Item>
      ) : null}

      {/* Plans */}
      {plans.length ? (
        <Item>
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Plans
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  current={subscription?.plan_id === plan.id}
                  paymentsEnabled={data.payments_enabled}
                  organizationId={data.organization_id}
                />
              ))}
            </div>
          </div>
        </Item>
      ) : null}

      {/* Credit ledger */}
      {transactions.length ? (
        <Item>
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent credit activity
              </h2>
              <ul className="flex flex-col divide-y divide-border/60">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{t.description ?? t.transaction_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono",
                        t.transaction_type === "usage" ? "text-muted-foreground" : "text-success-300",
                      )}
                    >
                      {t.transaction_type === "usage" ? "−" : "+"}
                      {Math.abs(Number(t.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </Item>
      ) : null}

      {/* Invoices */}
      <Item>
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <h2 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Receipt className="h-4 w-4 text-primary-400" aria-hidden />
              Invoices
            </h2>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No invoices yet — you are on the free plan.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border/60">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{inv.invoice_number ?? "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">
                        {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="font-mono">{money(inv.amount, inv.currency)}</span>
                      <Badge
                        className={cn(
                          "capitalize",
                          inv.status === "paid"
                            ? "bg-success-500/15 text-success-300"
                            : "bg-warning-500/15 text-warning-300",
                        )}
                      >
                        {inv.status}
                      </Badge>
                      {inv.pdf_url ? (
                        <a
                          href={inv.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-400 hover:text-primary-300"
                          aria-label="Download invoice"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Item>
    </Reveal>
  );
}
