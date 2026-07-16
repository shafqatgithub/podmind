/*
=========================================================
 PodMind AI
 Database Migration
 File: 05_workspaces.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- WORKSPACES
---------------------------------------------------------

CREATE TABLE public.workspaces (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    slug CITEXT NOT NULL,

    description TEXT,

    icon_url TEXT,

    color TEXT DEFAULT '#6366F1',

    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    visibility project_visibility DEFAULT 'private',

    is_default BOOLEAN DEFAULT FALSE,

    is_archived BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (organization_id, slug)

);

---------------------------------------------------------
-- WORKSPACE MEMBERS
---------------------------------------------------------

CREATE TABLE public.workspace_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role workspace_role DEFAULT 'contributor',

    invited_by UUID
        REFERENCES public.profiles(id),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    is_active BOOLEAN DEFAULT TRUE,

    UNIQUE (workspace_id, user_id)

);

---------------------------------------------------------
-- WORKSPACE INVITES
---------------------------------------------------------

CREATE TABLE public.workspace_invites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    email CITEXT NOT NULL,

    role workspace_role DEFAULT 'viewer',

    invite_token UUID DEFAULT gen_random_uuid(),

    invited_by UUID
        REFERENCES public.profiles(id),

    expires_at TIMESTAMPTZ,

    accepted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- WORKSPACE SETTINGS
---------------------------------------------------------

CREATE TABLE public.workspace_settings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL UNIQUE
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    default_ai_provider ai_provider DEFAULT 'openai',

    default_language language_code DEFAULT 'en',

    auto_save BOOLEAN DEFAULT TRUE,

    allow_exports BOOLEAN DEFAULT TRUE,

    allow_guest_access BOOLEAN DEFAULT FALSE,

    branding JSONB DEFAULT '{}'::jsonb,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- WORKSPACE ACTIVITY
---------------------------------------------------------

CREATE TABLE public.workspace_activity (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
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
-- WORKSPACE TAGS
---------------------------------------------------------

CREATE TABLE public.workspace_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    color TEXT DEFAULT '#6366F1',

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workspace_id, name)

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_workspace_org
ON public.workspaces(organization_id);

CREATE INDEX idx_workspace_owner
ON public.workspaces(owner_id);

CREATE INDEX idx_workspace_slug
ON public.workspaces(slug);

CREATE INDEX idx_workspace_member_user
ON public.workspace_members(user_id);

CREATE INDEX idx_workspace_member_workspace
ON public.workspace_members(workspace_id);

---------------------------------------------------------
-- UPDATED_AT TRIGGERS
---------------------------------------------------------

CREATE TRIGGER trg_workspaces_updated
BEFORE UPDATE
ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_workspace_settings_updated
BEFORE UPDATE
ON public.workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- WORKSPACE POLICIES
---------------------------------------------------------

CREATE POLICY "Workspace members can view workspaces"
ON public.workspaces
FOR SELECT
USING (

    id IN (

        SELECT workspace_id

        FROM public.workspace_members

        WHERE user_id = auth.uid()

    )

);

CREATE POLICY "Workspace owners can update workspaces"
ON public.workspaces
FOR UPDATE
USING (

    owner_id = auth.uid()

);

---------------------------------------------------------
-- MEMBERS POLICIES
---------------------------------------------------------

CREATE POLICY "Workspace members can view members"
ON public.workspace_members
FOR SELECT
USING (

    workspace_id IN (

        SELECT workspace_id

        FROM public.workspace_members

        WHERE user_id = auth.uid()

    )

);

---------------------------------------------------------
-- SETTINGS POLICIES
---------------------------------------------------------

CREATE POLICY "Workspace admins manage settings"
ON public.workspace_settings
FOR ALL
USING (

    workspace_id IN (

        SELECT workspace_id

        FROM public.workspace_members

        WHERE user_id = auth.uid()

        AND role IN ('owner','admin')

    )

);

COMMIT;

/*
=========================================================
Workspace Module Complete

Tables

✓ workspaces
✓ workspace_members
✓ workspace_invites
✓ workspace_settings
✓ workspace_activity
✓ workspace_tags

Features

✓ Multi Workspace Support
✓ Team Collaboration
✓ Workspace Roles
✓ Workspace Invitations
✓ Workspace Settings
✓ Activity Timeline
✓ Tags
✓ Enterprise Ready
✓ RLS Enabled

Ready For

06_projects.sql
=========================================================
*/
