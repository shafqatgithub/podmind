/*
=========================================================
 PodMind AI
 Database Migration
 File: 24_admin.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- ADMIN USERS
---------------------------------------------------------

CREATE TABLE public.admin_users (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL,

    permissions JSONB DEFAULT '[]'::jsonb,

    is_super_admin BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    last_login_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- ADMIN AUDIT LOGS
---------------------------------------------------------

CREATE TABLE public.admin_audit_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    admin_id UUID NOT NULL
        REFERENCES public.admin_users(id)
        ON DELETE CASCADE,

    action TEXT NOT NULL,

    resource_type TEXT,

    resource_id UUID,

    ip_address INET,

    user_agent TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SYSTEM SETTINGS
---------------------------------------------------------

CREATE TABLE public.system_settings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    setting_key TEXT UNIQUE NOT NULL,

    setting_value JSONB NOT NULL,

    description TEXT,

    category TEXT,

    is_public BOOLEAN DEFAULT FALSE,

    updated_by UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- FEATURE FLAGS
---------------------------------------------------------

CREATE TABLE public.feature_flags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT UNIQUE NOT NULL,

    description TEXT,

    enabled BOOLEAN DEFAULT FALSE,

    rollout_percentage INTEGER DEFAULT 100
        CHECK (rollout_percentage BETWEEN 0 AND 100),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SUPPORT TICKETS
---------------------------------------------------------

CREATE TABLE public.support_tickets (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    assigned_admin UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,

    subject TEXT NOT NULL,

    description TEXT,

    priority TEXT DEFAULT 'medium',

    status TEXT DEFAULT 'open',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SYSTEM ANNOUNCEMENTS
---------------------------------------------------------

CREATE TABLE public.system_announcements (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    severity TEXT DEFAULT 'info',

    starts_at TIMESTAMPTZ,

    ends_at TIMESTAMPTZ,

    is_active BOOLEAN DEFAULT TRUE,

    created_by UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SYSTEM HEALTH
---------------------------------------------------------

CREATE TABLE public.system_health (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    service_name TEXT NOT NULL,

    status TEXT NOT NULL,

    response_time_ms INTEGER,

    uptime_percentage NUMERIC(5,2),

    metadata JSONB DEFAULT '{}'::jsonb,

    checked_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_admin_user
ON public.admin_users(user_id);

CREATE INDEX idx_support_status
ON public.support_tickets(status);

CREATE INDEX idx_feature_flags
ON public.feature_flags(enabled);

CREATE INDEX idx_system_health
ON public.system_health(service_name);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_admin_users_updated
BEFORE UPDATE
ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_feature_flags_updated
BEFORE UPDATE
ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_support_updated
BEFORE UPDATE
ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Only super admins can manage admin users"

ON public.admin_users

FOR ALL

USING (

    EXISTS (

        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_super_admin = TRUE
        AND au.is_active = TRUE

    )

);

COMMIT;

/*
=========================================================

Admin Control Center Complete

Tables

✓ admin_users
✓ admin_audit_logs
✓ system_settings
✓ feature_flags
✓ support_tickets
✓ system_announcements
✓ system_health

Features

✓ Super Admin Panel
✓ Feature Flags
✓ Audit Logs
✓ Support Desk
✓ System Settings
✓ Announcements
✓ Health Monitoring
✓ Enterprise Ready

Ready For

25_integrations.sql

=========================================================
*/
