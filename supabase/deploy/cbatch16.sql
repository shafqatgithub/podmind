ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS paddle_price_id_monthly text,
  ADD COLUMN IF NOT EXISTS paddle_price_id_yearly  text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_paddle_monthly
  ON public.subscription_plans(paddle_price_id_monthly)
  WHERE paddle_price_id_monthly IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_paddle_yearly
  ON public.subscription_plans(paddle_price_id_yearly)
  WHERE paddle_price_id_yearly IS NOT NULL;
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
