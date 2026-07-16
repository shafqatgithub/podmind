/*
=========================================================
 PodMind AI
 Database Migration
 File: 04_organizations.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- ORGANIZATIONS
---------------------------------------------------------

CREATE TABLE public.organizations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    logo_url TEXT,

    website_url TEXT,

    description TEXT,

    industry TEXT,

    company_size TEXT,

    country TEXT,

    timezone TEXT DEFAULT 'UTC',

    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    subscription_plan subscription_plan DEFAULT 'free',

    is_verified BOOLEAN DEFAULT FALSE,

    is_active BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ORGANIZATION MEMBERS
---------------------------------------------------------

CREATE TABLE public.organization_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role organization_role DEFAULT 'member',

    invited_by UUID
        REFERENCES public.profiles(id),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE (organization_id, user_id)

);

---------------------------------------------------------
-- ORGANIZATION INVITES
---------------------------------------------------------

CREATE TABLE public.organization_invites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    email CITEXT NOT NULL,

    role organization_role DEFAULT 'member',

    invite_token UUID DEFAULT gen_random_uuid(),

    invited_by UUID
        REFERENCES public.profiles(id),

    expires_at TIMESTAMPTZ,

    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ORGANIZATION SETTINGS
---------------------------------------------------------

CREATE TABLE public.organization_settings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL UNIQUE
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    allow_member_invites BOOLEAN DEFAULT TRUE,

    allow_public_projects BOOLEAN DEFAULT FALSE,

    default_language language_code DEFAULT 'en',

    default_ai_provider ai_provider DEFAULT 'openai',

    branding JSONB DEFAULT '{}'::jsonb,

    security JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ORGANIZATION ACTIVITY
---------------------------------------------------------

CREATE TABLE public.organization_activity (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    action audit_action NOT NULL,

    entity_type TEXT,

    entity_id UUID,

    description TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_org_slug
ON public.organizations(slug);

CREATE INDEX idx_org_owner
ON public.organizations(owner_id);

CREATE INDEX idx_org_members_org
ON public.organization_members(organization_id);

CREATE INDEX idx_org_members_user
ON public.organization_members(user_id);

CREATE INDEX idx_org_invites_email
ON public.organization_invites(email);

---------------------------------------------------------
-- UPDATED_AT TRIGGERS
---------------------------------------------------------

CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE
ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_org_settings_updated
BEFORE UPDATE
ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY
---------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activity ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- ORGANIZATION POLICIES
---------------------------------------------------------

CREATE POLICY "Organization members can view organizations"
ON public.organizations
FOR SELECT
USING (
    id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Organization owners can update organizations"
ON public.organizations
FOR UPDATE
USING (
    owner_id = auth.uid()
);

---------------------------------------------------------
-- MEMBER POLICIES
---------------------------------------------------------

CREATE POLICY "Members can view organization members"
ON public.organization_members
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

---------------------------------------------------------
-- SETTINGS POLICY
---------------------------------------------------------

CREATE POLICY "Organization admins manage settings"
ON public.organization_settings
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);

COMMIT;

/*
=========================================================
Organization Module Complete

Tables

✓ organizations
✓ organization_members
✓ organization_invites
✓ organization_settings
✓ organization_activity

Features

✓ Multi-Tenant Organizations
✓ Member Management
✓ Invitation System
✓ Organization Settings
✓ Activity Log
✓ Enterprise Ready
✓ RLS Enabled

Ready For

05_workspaces.sql
=========================================================
*/

---------------------------------------------------------
-- PROFILES: CURRENT ORGANIZATION POINTER
-- (RLS helper current_organization_id() and 28_indexes
--  depend on this column; added here because organizations
--  must exist before the FK can be created.)
---------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL;
