/*
=========================================================
 PodMind AI
 Database Migration
 File: 10_scripts.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- SCRIPTS
---------------------------------------------------------

CREATE TABLE public.scripts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    outline_id UUID
        REFERENCES public.outlines(id)
        ON DELETE SET NULL,

    guest_id UUID
        REFERENCES public.guests(id)
        ON DELETE SET NULL,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    title TEXT NOT NULL,

    description TEXT,

    script_style script_style DEFAULT 'interview',

    content TEXT,

    word_count INTEGER DEFAULT 0,

    estimated_duration_minutes INTEGER,

    language language_code DEFAULT 'en',

    tone content_tone DEFAULT 'professional',

    ai_provider ai_provider DEFAULT 'openai',

    version INTEGER DEFAULT 1,

    status project_status DEFAULT 'draft',

    is_current BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT SECTIONS
---------------------------------------------------------

CREATE TABLE public.script_sections (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    parent_section_id UUID
        REFERENCES public.script_sections(id)
        ON DELETE CASCADE,

    title TEXT,

    speaker TEXT,

    content TEXT,

    notes TEXT,

    duration_seconds INTEGER,

    sort_order INTEGER DEFAULT 1,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT COMMENTS
---------------------------------------------------------

CREATE TABLE public.script_comments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    comment TEXT NOT NULL,

    selected_text TEXT,

    resolved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT VERSIONS
---------------------------------------------------------

CREATE TABLE public.script_versions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    version INTEGER NOT NULL,

    snapshot JSONB NOT NULL,

    created_by UUID
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT APPROVALS
---------------------------------------------------------

CREATE TABLE public.script_approvals (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    approved_by UUID
        REFERENCES public.profiles(id),

    approved BOOLEAN DEFAULT FALSE,

    notes TEXT,

    approved_at TIMESTAMPTZ

);

---------------------------------------------------------
-- SCRIPT AI SUGGESTIONS
---------------------------------------------------------

CREATE TABLE public.script_ai_suggestions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    section_id UUID
        REFERENCES public.script_sections(id)
        ON DELETE CASCADE,

    suggestion_type TEXT,

    suggestion TEXT,

    accepted BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT REVISIONS
---------------------------------------------------------

CREATE TABLE public.script_revisions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    changed_by UUID
        REFERENCES public.profiles(id),

    change_summary TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.script_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    chunk_text TEXT,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SCRIPT EXPORTS
---------------------------------------------------------

CREATE TABLE public.script_exports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    script_id UUID NOT NULL
        REFERENCES public.scripts(id)
        ON DELETE CASCADE,

    exported_by UUID
        REFERENCES public.profiles(id),

    format export_format,

    file_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_scripts_project
ON public.scripts(project_id);

CREATE INDEX idx_scripts_outline
ON public.scripts(outline_id);

CREATE INDEX idx_scripts_guest
ON public.scripts(guest_id);

CREATE INDEX idx_script_sections
ON public.script_sections(script_id);

CREATE INDEX idx_script_comments
ON public.script_comments(script_id);

CREATE INDEX idx_script_embedding
ON public.script_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_scripts_updated
BEFORE UPDATE
ON public.scripts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_script_sections_updated
BEFORE UPDATE
ON public.script_sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_exports ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage scripts"

ON public.scripts

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

Script Studio Module Complete

Tables

✓ scripts
✓ script_sections
✓ script_comments
✓ script_versions
✓ script_approvals
✓ script_ai_suggestions
✓ script_revisions
✓ script_embeddings
✓ script_exports

Features

✓ AI Script Generator
✓ Rich Script Editor
✓ Speaker Blocks
✓ AI Suggestions
✓ Version Control
✓ Team Collaboration
✓ Approval Workflow
✓ Semantic Search
✓ Export System
✓ Enterprise Ready

Ready For

11_seo.sql

=========================================================
*/
