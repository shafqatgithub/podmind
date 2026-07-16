/*
=========================================================
 PodMind AI
 Database Migration
 File: 17_ai_provider.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AI PROVIDERS
---------------------------------------------------------

CREATE TABLE public.ai_providers (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    provider_type ai_provider NOT NULL,

    base_url TEXT,

    api_version TEXT,

    default_model TEXT,

    supports_streaming BOOLEAN DEFAULT TRUE,

    supports_tools BOOLEAN DEFAULT TRUE,

    supports_vision BOOLEAN DEFAULT FALSE,

    supports_audio BOOLEAN DEFAULT FALSE,

    supports_embeddings BOOLEAN DEFAULT TRUE,

    supports_json BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,

    priority INTEGER DEFAULT 1,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI MODELS
---------------------------------------------------------

CREATE TABLE public.ai_models (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,

    model_name TEXT NOT NULL,

    display_name TEXT,

    model_family TEXT,

    context_window INTEGER,

    max_output_tokens INTEGER,

    input_price NUMERIC(12,6),

    output_price NUMERIC(12,6),

    embedding_dimensions INTEGER,

    supports_function_calling BOOLEAN DEFAULT TRUE,

    supports_reasoning BOOLEAN DEFAULT FALSE,

    supports_vision BOOLEAN DEFAULT FALSE,

    supports_audio BOOLEAN DEFAULT FALSE,

    supports_image_generation BOOLEAN DEFAULT FALSE,

    is_default BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ORGANIZATION AI SETTINGS
---------------------------------------------------------

CREATE TABLE public.organization_ai_settings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    default_provider_id UUID
        REFERENCES public.ai_providers(id),

    default_model_id UUID
        REFERENCES public.ai_models(id),

    fallback_provider_id UUID
        REFERENCES public.ai_providers(id),

    fallback_model_id UUID
        REFERENCES public.ai_models(id),

    temperature NUMERIC(3,2) DEFAULT 0.70,

    max_tokens INTEGER DEFAULT 4096,

    enable_streaming BOOLEAN DEFAULT TRUE,

    enable_fallback BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)

);

---------------------------------------------------------
-- AI API KEYS
---------------------------------------------------------

CREATE TABLE public.ai_api_keys (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,

    key_name TEXT,

    encrypted_api_key TEXT NOT NULL,

    last_used_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI REQUESTS
---------------------------------------------------------

CREATE TABLE public.ai_requests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    conversation_id UUID
        REFERENCES public.ai_conversations(id)
        ON DELETE SET NULL,

    provider_id UUID
        REFERENCES public.ai_providers(id),

    model_id UUID
        REFERENCES public.ai_models(id),

    task ai_task,

    prompt_tokens INTEGER DEFAULT 0,

    completion_tokens INTEGER DEFAULT 0,

    total_tokens INTEGER DEFAULT 0,

    estimated_cost NUMERIC(12,6),

    latency_ms INTEGER,

    success BOOLEAN DEFAULT TRUE,

    error_message TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI PROVIDER HEALTH
---------------------------------------------------------

CREATE TABLE public.ai_provider_health (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,

    status TEXT,

    average_latency_ms INTEGER,

    success_rate NUMERIC(5,2),

    requests_today INTEGER DEFAULT 0,

    failed_requests INTEGER DEFAULT 0,

    checked_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_provider_slug
ON public.ai_providers(slug);

CREATE INDEX idx_model_provider
ON public.ai_models(provider_id);

CREATE INDEX idx_requests_provider
ON public.ai_requests(provider_id);

CREATE INDEX idx_requests_model
ON public.ai_requests(model_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_ai_provider_updated
BEFORE UPDATE
ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_ai_settings_updated
BEFORE UPDATE
ON public.organization_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Authenticated users can view providers"

ON public.ai_providers

FOR SELECT

USING (auth.role() = 'authenticated');

CREATE POLICY "Organizations manage AI settings"

ON public.organization_ai_settings

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

AI Provider Layer Complete

Tables

✓ ai_providers
✓ ai_models
✓ organization_ai_settings
✓ ai_api_keys
✓ ai_requests
✓ ai_provider_health

Features

✓ Multi-Provider Support
✓ OpenAI
✓ Claude
✓ Gemini
✓ DeepSeek Ready
✓ Grok Ready
✓ Llama Ready
✓ Model Routing
✓ Cost Tracking
✓ Fallback Models
✓ Provider Health Monitoring
✓ Enterprise Ready

Ready For

18_billing.sql

=========================================================
*/
