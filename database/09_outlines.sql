/*
=========================================================
 PodMind AI
 Database Migration
 File: 09_outlines.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- OUTLINES
---------------------------------------------------------

CREATE TABLE public.outlines (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    research_session_id UUID
        REFERENCES public.research_sessions(id)
        ON DELETE SET NULL,

    guest_id UUID
        REFERENCES public.guests(id)
        ON DELETE SET NULL,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    title TEXT NOT NULL,

    description TEXT,

    outline_type script_style DEFAULT 'interview',

    ai_provider ai_provider DEFAULT 'openai',

    status project_status DEFAULT 'draft',

    estimated_duration_minutes INTEGER,

    version INTEGER DEFAULT 1,

    is_current BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- OUTLINE SECTIONS
---------------------------------------------------------

CREATE TABLE public.outline_sections (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    parent_section_id UUID
        REFERENCES public.outline_sections(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    sort_order INTEGER DEFAULT 1,

    estimated_minutes INTEGER,

    talking_points JSONB DEFAULT '[]'::jsonb,

    notes TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- TALKING POINTS
---------------------------------------------------------

CREATE TABLE public.outline_talking_points (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    section_id UUID NOT NULL
        REFERENCES public.outline_sections(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    sort_order INTEGER DEFAULT 1,

    ai_generated BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- FOLLOW-UP QUESTIONS
---------------------------------------------------------

CREATE TABLE public.outline_questions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    question TEXT NOT NULL,

    category TEXT,

    priority INTEGER DEFAULT 1,

    ai_generated BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- OUTLINE COMMENTS
---------------------------------------------------------

CREATE TABLE public.outline_comments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    comment TEXT NOT NULL,

    resolved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- OUTLINE VERSIONS
---------------------------------------------------------

CREATE TABLE public.outline_versions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    version INTEGER NOT NULL,

    snapshot JSONB NOT NULL,

    created_by UUID
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- OUTLINE APPROVALS
---------------------------------------------------------

CREATE TABLE public.outline_approvals (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    approved_by UUID
        REFERENCES public.profiles(id),

    approved BOOLEAN DEFAULT FALSE,

    approved_at TIMESTAMPTZ,

    notes TEXT

);

---------------------------------------------------------
-- OUTLINE EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.outline_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    outline_id UUID NOT NULL
        REFERENCES public.outlines(id)
        ON DELETE CASCADE,

    chunk_text TEXT,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_outline_project
ON public.outlines(project_id);

CREATE INDEX idx_outline_guest
ON public.outlines(guest_id);

CREATE INDEX idx_outline_research
ON public.outlines(research_session_id);

CREATE INDEX idx_outline_sections
ON public.outline_sections(outline_id);

CREATE INDEX idx_outline_questions
ON public.outline_questions(outline_id);

CREATE INDEX idx_outline_embedding
ON public.outline_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_outline_updated

BEFORE UPDATE

ON public.outlines

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_outline_sections_updated

BEFORE UPDATE

ON public.outline_sections

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_talking_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_embeddings ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage outlines"

ON public.outlines

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

Outline Module Complete

Tables

✓ outlines
✓ outline_sections
✓ outline_talking_points
✓ outline_questions
✓ outline_comments
✓ outline_versions
✓ outline_approvals
✓ outline_embeddings

Features

✓ AI Outline Generator
✓ Multi-Level Sections
✓ Talking Points
✓ Follow-up Questions
✓ Team Comments
✓ Version History
✓ Approval Workflow
✓ Semantic Search
✓ RAG Ready
✓ Enterprise Ready

Ready For

10_scripts.sql

=========================================================
*/
