-- ============================================================
-- 40_paddle_billing.sql
-- Paddle Billing support.
--
-- Paddle is the merchant of record: it owns the checkout, the card data and
-- the tax liability, and tells us what happened over webhooks. So this
-- migration adds only what we need to (a) map a Paddle price back to one of
-- our plans, and (b) process each webhook exactly once.
--
-- organization_subscriptions already stores provider_customer_id and
-- provider_subscription_id under provider-neutral names, so no change is
-- needed there.
-- ============================================================

BEGIN;

-- (a) Map a Paddle price to a plan and billing cycle.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS paddle_price_id_yearly  text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_paddle_monthly
  ON public.subscription_plans(paddle_price_id_monthly)
  WHERE paddle_price_id_monthly IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_paddle_yearly
  ON public.subscription_plans(paddle_price_id_yearly)
  WHERE paddle_price_id_yearly IS NOT NULL;

-- (b) Webhook idempotency.
--
-- Paddle retries a webhook until it gets a 2xx, and retries are expected
-- rather than exceptional. Without this table a retried transaction.completed
-- would grant the customer their credits twice. The event id is the primary
-- key, so a duplicate insert fails and the handler can stop early.
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    event_id      text PRIMARY KEY,
    event_type    text NOT NULL,
    provider      text NOT NULL DEFAULT 'paddle',
    payload       jsonb,
    processed_at  timestamptz NOT NULL DEFAULT now(),
    error_message text
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_type
  ON public.payment_webhook_events(event_type, processed_at DESC);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- No policy is defined on purpose: only the service role writes here, and
-- nothing in the client application has any reason to read it.

COMMIT;
