/*
=========================================================
 PodMind AI
 Database Migration
 File: 22_analytics.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- ANALYTICS DASHBOARDS
---------------------------------------------------------

CREATE TABLE public.analytics_dashboards (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    description TEXT,

    is_default BOOLEAN DEFAULT FALSE,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ANALYTICS WIDGETS
---------------------------------------------------------

CREATE TABLE public.analytics_widgets (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    dashboard_id UUID NOT NULL
        REFERENCES public.analytics_dashboards(id)
        ON DELETE CASCADE,

    widget_type TEXT NOT NULL,

    title TEXT,

    config JSONB DEFAULT '{}'::jsonb,

    position_x INTEGER DEFAULT 0,

    position_y INTEGER DEFAULT 0,

    width INTEGER DEFAULT 4,

    height INTEGER DEFAULT 4,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ANALYTICS EVENTS
---------------------------------------------------------

CREATE TABLE public.analytics_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,

    event_name TEXT NOT NULL,

    event_category TEXT,

    event_data JSONB DEFAULT '{}'::jsonb,

    session_id UUID,

    ip_address INET,

    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KPI SNAPSHOTS
---------------------------------------------------------

CREATE TABLE public.analytics_kpis (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    metric_name TEXT NOT NULL,

    metric_value NUMERIC(18,4),

    metric_unit TEXT,

    period TEXT,

    recorded_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- USER PRODUCTIVITY
---------------------------------------------------------

CREATE TABLE public.user_productivity (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    scripts_created INTEGER DEFAULT 0,

    research_completed INTEGER DEFAULT 0,

    ai_requests INTEGER DEFAULT 0,

    exports_generated INTEGER DEFAULT 0,

    active_minutes INTEGER DEFAULT 0,

    productivity_score NUMERIC(5,2),

    recorded_at DATE DEFAULT CURRENT_DATE

);

---------------------------------------------------------
-- AI ANALYTICS
---------------------------------------------------------

CREATE TABLE public.ai_analytics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    provider_id UUID
        REFERENCES public.ai_providers(id)
        ON DELETE SET NULL,

    model_id UUID
        REFERENCES public.ai_models(id)
        ON DELETE SET NULL,

    total_requests INTEGER DEFAULT 0,

    total_tokens BIGINT DEFAULT 0,

    total_cost NUMERIC(12,6),

    avg_latency_ms INTEGER,

    success_rate NUMERIC(5,2),

    recorded_at DATE DEFAULT CURRENT_DATE

);

---------------------------------------------------------
-- FEATURE ANALYTICS
---------------------------------------------------------

CREATE TABLE public.feature_analytics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    feature_name TEXT NOT NULL,

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    usage_count INTEGER DEFAULT 0,

    unique_users INTEGER DEFAULT 0,

    avg_duration_seconds INTEGER,

    recorded_at DATE DEFAULT CURRENT_DATE

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_analytics_events_org
ON public.analytics_events(organization_id);

CREATE INDEX idx_analytics_events_user
ON public.analytics_events(user_id);

CREATE INDEX idx_ai_analytics_org
ON public.ai_analytics(organization_id);

CREATE INDEX idx_feature_analytics
ON public.feature_analytics(feature_name);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_dashboard_updated
BEFORE UPDATE
ON public.analytics_dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_widget_updated
BEFORE UPDATE
ON public.analytics_widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_analytics ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Organization analytics access"

ON public.analytics_dashboards

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

Analytics Engine Complete

Tables

✓ analytics_dashboards
✓ analytics_widgets
✓ analytics_events
✓ analytics_kpis
✓ user_productivity
✓ ai_analytics
✓ feature_analytics

Features

✓ Executive Dashboard
✓ AI Usage Analytics
✓ Productivity Tracking
✓ Feature Adoption
✓ KPI Snapshots
✓ Event Tracking
✓ Business Intelligence
✓ Enterprise Ready

Ready For

23_marketplace.sql

=========================================================
*/
