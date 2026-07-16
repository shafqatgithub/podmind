/*
=========================================================
 PodMind AI
 Database Migration
 File: 23_api.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- API KEYS
---------------------------------------------------------

CREATE TABLE public.api_keys (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,

    key_prefix TEXT NOT NULL,

    hashed_key TEXT NOT NULL,

    permissions JSONB DEFAULT '[]'::jsonb,

    allowed_ips JSONB DEFAULT '[]'::jsonb,

    allowed_origins JSONB DEFAULT '[]'::jsonb,

    rate_limit_per_minute INTEGER DEFAULT 60,

    expires_at TIMESTAMPTZ,

    last_used_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API TOKENS
---------------------------------------------------------

CREATE TABLE public.api_tokens (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    api_key_id UUID NOT NULL
        REFERENCES public.api_keys(id)
        ON DELETE CASCADE,

    access_token_hash TEXT NOT NULL,

    refresh_token_hash TEXT,

    expires_at TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API REQUEST LOGS
---------------------------------------------------------

CREATE TABLE public.api_request_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE SET NULL,

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,

    endpoint TEXT NOT NULL,

    method TEXT NOT NULL,

    status_code INTEGER,

    response_time_ms INTEGER,

    request_size BIGINT,

    response_size BIGINT,

    ip_address INET,

    user_agent TEXT,

    request_id UUID DEFAULT gen_random_uuid(),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API WEBHOOKS
---------------------------------------------------------

CREATE TABLE public.api_webhooks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    name TEXT,

    endpoint_url TEXT NOT NULL,

    secret TEXT,

    subscribed_events JSONB DEFAULT '[]'::jsonb,

    retry_attempts INTEGER DEFAULT 3,

    timeout_seconds INTEGER DEFAULT 30,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API WEBHOOK DELIVERIES
---------------------------------------------------------

CREATE TABLE public.api_webhook_deliveries (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    webhook_id UUID NOT NULL
        REFERENCES public.api_webhooks(id)
        ON DELETE CASCADE,

    event_name TEXT,

    payload JSONB,

    response_code INTEGER,

    response_body TEXT,

    duration_ms INTEGER,

    attempts INTEGER DEFAULT 1,

    status TEXT DEFAULT 'pending',

    delivered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API RATE LIMITS
---------------------------------------------------------

CREATE TABLE public.api_rate_limits (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE CASCADE,

    window_start TIMESTAMPTZ NOT NULL,

    request_count INTEGER DEFAULT 0,

    blocked_requests INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- API AUDIT LOG
---------------------------------------------------------

CREATE TABLE public.api_audit_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    resource_type TEXT,

    resource_id UUID,

    performed_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_api_keys_org
ON public.api_keys(organization_id);

CREATE INDEX idx_api_logs_key
ON public.api_request_logs(api_key_id);

CREATE INDEX idx_api_logs_org
ON public.api_request_logs(organization_id);

CREATE INDEX idx_api_webhooks_org
ON public.api_webhooks(organization_id);

CREATE INDEX idx_api_rate_limits
ON public.api_rate_limits(api_key_id, window_start);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_api_keys_updated
BEFORE UPDATE
ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_api_webhooks_updated
BEFORE UPDATE
ON public.api_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Organization members manage API keys"

ON public.api_keys

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

API Gateway Complete

Tables

✓ api_keys
✓ api_tokens
✓ api_request_logs
✓ api_webhooks
✓ api_webhook_deliveries
✓ api_rate_limits
✓ api_audit_logs

Features

✓ API Keys
✓ OAuth Ready
✓ JWT Tokens
✓ Rate Limiting
✓ Request Logging
✓ Webhooks
✓ Audit Logs
✓ Enterprise Security
✓ Developer Platform Ready

Ready For

24_integrations.sql

=========================================================
*/
