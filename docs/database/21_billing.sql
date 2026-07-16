/*
=========================================================
 PodMind AI
 Database Migration
 File: 21_billing.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- SUBSCRIPTION PLANS
---------------------------------------------------------

CREATE TABLE public.subscription_plans (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    description TEXT,

    monthly_price NUMERIC(10,2) NOT NULL,

    yearly_price NUMERIC(10,2),

    currency TEXT DEFAULT 'USD',

    ai_credits INTEGER DEFAULT 0,

    max_projects INTEGER,

    max_team_members INTEGER,

    max_storage_gb INTEGER,

    features JSONB DEFAULT '{}'::jsonb,

    is_public BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ORGANIZATION SUBSCRIPTIONS
---------------------------------------------------------

CREATE TABLE public.organization_subscriptions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    plan_id UUID NOT NULL
        REFERENCES public.subscription_plans(id),

    status TEXT DEFAULT 'trial',

    billing_cycle TEXT DEFAULT 'monthly',

    current_period_start TIMESTAMPTZ,

    current_period_end TIMESTAMPTZ,

    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    trial_ends_at TIMESTAMPTZ,

    provider_customer_id TEXT,

    provider_subscription_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)

);

---------------------------------------------------------
-- AI CREDIT BALANCE
---------------------------------------------------------

CREATE TABLE public.ai_credit_balances (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    available_credits INTEGER DEFAULT 0,

    used_credits INTEGER DEFAULT 0,

    purchased_credits INTEGER DEFAULT 0,

    expires_at TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)

);

---------------------------------------------------------
-- AI CREDIT TRANSACTIONS
---------------------------------------------------------

CREATE TABLE public.ai_credit_transactions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    amount INTEGER NOT NULL,

    transaction_type TEXT NOT NULL,

    description TEXT,

    related_request UUID
        REFERENCES public.ai_requests(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PAYMENT METHODS
---------------------------------------------------------

CREATE TABLE public.payment_methods (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    provider TEXT,

    provider_payment_method_id TEXT,

    brand TEXT,

    last4 TEXT,

    expiry_month INTEGER,

    expiry_year INTEGER,

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INVOICES
---------------------------------------------------------

CREATE TABLE public.invoices (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    invoice_number TEXT,

    amount NUMERIC(10,2),

    currency TEXT DEFAULT 'USD',

    status TEXT,

    invoice_url TEXT,

    pdf_url TEXT,

    issued_at TIMESTAMPTZ,

    due_at TIMESTAMPTZ,

    paid_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- USAGE METERING
---------------------------------------------------------

CREATE TABLE public.usage_metering (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    resource TEXT,

    quantity NUMERIC(12,2),

    unit TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    recorded_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- BILLING EVENTS
---------------------------------------------------------

CREATE TABLE public.billing_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    event_name TEXT,

    payload JSONB,

    processed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_subscription_org
ON public.organization_subscriptions(organization_id);

CREATE INDEX idx_credit_org
ON public.ai_credit_balances(organization_id);

CREATE INDEX idx_invoice_org
ON public.invoices(organization_id);

CREATE INDEX idx_usage_org
ON public.usage_metering(organization_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_subscription_updated
BEFORE UPDATE
ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_plan_updated
BEFORE UPDATE
ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS
---------------------------------------------------------

CREATE POLICY "Organizations manage subscriptions"

ON public.organization_subscriptions

FOR ALL

USING (

    organization_id IN (

        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()

    )

);

COMMIT;

/*
=========================================================

Billing Engine Complete

Tables

✓ subscription_plans
✓ organization_subscriptions
✓ ai_credit_balances
✓ ai_credit_transactions
✓ payment_methods
✓ invoices
✓ usage_metering
✓ billing_events

Features

✓ SaaS Subscriptions
✓ Monthly / Yearly Plans
✓ AI Credits
✓ Usage Metering
✓ Team Billing
✓ Payment Methods
✓ Invoices
✓ Enterprise Ready

Ready For

22_integrations.sql

=========================================================
*/
