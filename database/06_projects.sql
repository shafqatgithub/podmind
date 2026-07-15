/*
=========================================================
 PodMind AI
 Database Migration
 File: 06_projects.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- PROJECTS
---------------------------------------------------------

CREATE TABLE public.projects (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,

    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    title TEXT NOT NULL,

    slug CITEXT,

    description TEXT,

    thumbnail_url TEXT,

    status project_status DEFAULT 'draft',

    visibility project_visibility DEFAULT 'private',

    language language_code DEFAULT 'en',

    category TEXT,

    niche TEXT,

    audience TEXT,

    podcast_name TEXT,

    cover_image TEXT,

    color TEXT DEFAULT '#6366F1',

    icon TEXT,

    is_favorite BOOLEAN DEFAULT FALSE,

    is_template BOOLEAN DEFAULT FALSE,

    is_archived BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(workspace_id, slug)

);

---------------------------------------------------------
-- PROJECT MEMBERS
---------------------------------------------------------

CREATE TABLE public.project_members (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    role workspace_role DEFAULT 'viewer',

    invited_by UUID
        REFERENCES public.profiles(id),

    joined_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, user_id)

);

---------------------------------------------------------
-- PROJECT TAGS
---------------------------------------------------------

CREATE TABLE public.project_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    color TEXT DEFAULT '#6366F1',

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PROJECT FILES
---------------------------------------------------------

CREATE TABLE public.project_files (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    uploaded_by UUID
        REFERENCES public.profiles(id),

    file_name TEXT NOT NULL,

    file_type file_type,

    file_url TEXT NOT NULL,

    file_size BIGINT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PROJECT NOTES
---------------------------------------------------------

CREATE TABLE public.project_notes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id),

    title TEXT,

    content TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PROJECT ACTIVITY
---------------------------------------------------------

CREATE TABLE public.project_activity (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id),

    action audit_action,

    entity_type TEXT,

    entity_id UUID,

    description TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PROJECT FAVORITES
---------------------------------------------------------

CREATE TABLE public.project_favorites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, user_id)

);

---------------------------------------------------------
-- PROJECT VERSIONS
---------------------------------------------------------

CREATE TABLE public.project_versions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    version_number INTEGER NOT NULL,

    snapshot JSONB NOT NULL,

    created_by UUID
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_projects_workspace
ON public.projects(workspace_id);

CREATE INDEX idx_projects_owner
ON public.projects(owner_id);

CREATE INDEX idx_projects_status
ON public.projects(status);

CREATE INDEX idx_projects_slug
ON public.projects(slug);

CREATE INDEX idx_project_members_project
ON public.project_members(project_id);

CREATE INDEX idx_project_members_user
ON public.project_members(user_id);

---------------------------------------------------------
-- UPDATED_AT TRIGGERS
---------------------------------------------------------

CREATE TRIGGER trg_projects_updated
BEFORE UPDATE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_project_notes_updated
BEFORE UPDATE
ON public.project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- PROJECT POLICIES
---------------------------------------------------------

CREATE POLICY "Project members can access projects"
ON public.projects
FOR ALL
USING (

    id IN (

        SELECT project_id

        FROM public.project_members

        WHERE user_id = auth.uid()

    )

);

---------------------------------------------------------
-- PROJECT MEMBERS POLICIES
---------------------------------------------------------

CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (

    project_id IN (

        SELECT project_id

        FROM public.project_members

        WHERE user_id = auth.uid()

    )

);

---------------------------------------------------------
-- NOTES POLICIES
---------------------------------------------------------

CREATE POLICY "Members manage project notes"
ON public.project_notes
FOR ALL
USING (

    project_id IN (

        SELECT project_id

        FROM public.project_members

        WHERE user_id = auth.uid()

    )

);

COMMIT;

/*
=========================================================
Projects Module Complete

Tables

✓ projects
✓ project_members
✓ project_tags
✓ project_files
✓ project_notes
✓ project_activity
✓ project_favorites
✓ project_versions

Features

✓ Multi-user Projects
✓ Workspace Integration
✓ Tags
✓ Files
✓ Notes
✓ Activity Feed
✓ Favorites
✓ Version History
✓ RLS Protected

Ready For

07_research.sql

=========================================================
*/
