/*
=========================================================
 PodMind AI
 Database Migration
 File: 26_enterprise.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- ENTERPRISE ORGANIZATIONS
---------------------------------------------------------

CREATE TABLE public.enterprise_settings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    company_name TEXT,

    domain TEXT,

    sso_enabled BOOLEAN DEFAULT FALSE,

    scim_enabled BOOLEAN DEFAULT FALSE,

    audit_logs_enabled BOOLEAN DEFAULT TRUE,

    ip_whitelist JSONB DEFAULT '[]'::jsonb,

    allowed_email_domains JSONB DEFAULT '[]'::jsonb,

    data_retention_days INTEGER DEFAULT 365,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id)

);

---------------------------------------------------------
-- ORGANIZATION DOMAINS
---------------------------------------------------------

CREATE TABLE public.organization_domains (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    domain TEXT UNIQUE NOT NULL,

    verified BOOLEAN DEFAULT FALSE,

    verification_token TEXT,

    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SSO PROVIDERS
---------------------------------------------------------

CREATE TABLE public.sso_providers (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    provider_name TEXT NOT NULL,

    provider_type TEXT NOT NULL,

    client_id TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCIM PROVISIONING
---------------------------------------------------------

CREATE TABLE public.scim_provisioning (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    bearer_token_hash TEXT,

    enabled BOOLEAN DEFAULT FALSE,

    last_sync_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SECURITY EVENTS
---------------------------------------------------------

CREATE TABLE public.security_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    event_type TEXT,

    severity TEXT,

    ip_address INET,

    user_agent TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AUDIT EVENTS
---------------------------------------------------------

CREATE TABLE public.audit_events (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    action TEXT,

    resource_type TEXT,

    resource_id UUID,

    changes JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- DATA EXPORT REQUESTS
---------------------------------------------------------

CREATE TABLE public.enterprise_data_exports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    requested_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    export_type TEXT,

    status TEXT DEFAULT 'pending',

    file_url TEXT,

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    completed_at TIMESTAMPTZ

);

---------------------------------------------------------
-- COMPLIANCE REPORTS
---------------------------------------------------------

CREATE TABLE public.compliance_reports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    report_type TEXT,

    report_url TEXT,

    generated_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_enterprise_org
ON public.enterprise_settings(organization_id);

CREATE INDEX idx_security_org
ON public.security_events(organization_id);

CREATE INDEX idx_audit_org
ON public.audit_events(organization_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_enterprise_updated

BEFORE UPDATE

ON public.enterprise_settings

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Enterprise members access settings"

ON public.enterprise_settings

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

Enterprise Module Complete

Tables

✓ enterprise_settings
✓ organization_domains
✓ sso_providers
✓ scim_provisioning
✓ security_events
✓ audit_events
✓ enterprise_data_exports
✓ compliance_reports

Enterprise Features

✓ Single Sign-On (SSO)
✓ SCIM User Provisioning
✓ Enterprise Security
✓ Organization Domains
✓ Audit Trail
✓ Security Monitoring
✓ Compliance Reports
✓ Data Export Requests
✓ Enterprise Governance

Ready For

27_integrations.sql

=========================================================
*/
