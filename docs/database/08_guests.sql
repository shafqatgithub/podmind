/*
=========================================================
 PodMind AI
 Database Migration
 File: 08_guests.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- GUESTS
---------------------------------------------------------

CREATE TABLE public.guests (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    full_name TEXT NOT NULL,

    slug CITEXT,

    headline TEXT,

    biography TEXT,

    company TEXT,

    job_title TEXT,

    industry TEXT,

    country TEXT,

    city TEXT,

    website_url TEXT,

    email TEXT,

    phone TEXT,

    image_url TEXT,

    status record_status DEFAULT 'active',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, slug)

);

---------------------------------------------------------
-- GUEST SOCIAL PROFILES
---------------------------------------------------------

CREATE TABLE public.guest_social_profiles (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    platform social_platform NOT NULL,

    username TEXT,

    profile_url TEXT,

    followers BIGINT DEFAULT 0,

    verified BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST COMPANIES
---------------------------------------------------------

CREATE TABLE public.guest_companies (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    company_name TEXT NOT NULL,

    role TEXT,

    start_date DATE,

    end_date DATE,

    is_current BOOLEAN DEFAULT FALSE,

    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST BOOKS
---------------------------------------------------------

CREATE TABLE public.guest_books (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    publisher TEXT,

    published_date DATE,

    isbn TEXT,

    description TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST INTERVIEWS
---------------------------------------------------------

CREATE TABLE public.guest_interviews (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    platform TEXT,

    interview_title TEXT,

    interview_url TEXT,

    interview_date DATE,

    summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST QUESTIONS
---------------------------------------------------------

CREATE TABLE public.guest_questions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    question TEXT NOT NULL,

    question_type TEXT,

    difficulty TEXT,

    ai_generated BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST NOTES
---------------------------------------------------------

CREATE TABLE public.guest_notes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    note TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST TAGS
---------------------------------------------------------

CREATE TABLE public.guest_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- GUEST EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.guest_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,

    chunk_text TEXT,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_guest_project
ON public.guests(project_id);

CREATE INDEX idx_guest_slug
ON public.guests(slug);

CREATE INDEX idx_guest_company
ON public.guest_companies(company_name);

CREATE INDEX idx_guest_social
ON public.guest_social_profiles(guest_id);

CREATE INDEX idx_guest_questions
ON public.guest_questions(guest_id);

CREATE INDEX idx_guest_embedding
ON public.guest_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT TRIGGER
---------------------------------------------------------

CREATE TRIGGER trg_guests_updated
BEFORE UPDATE
ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_guest_notes_updated
BEFORE UPDATE
ON public.guest_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_embeddings ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage guests"

ON public.guests

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

Guest Intelligence Module Complete

Tables

✓ guests
✓ guest_social_profiles
✓ guest_companies
✓ guest_books
✓ guest_interviews
✓ guest_questions
✓ guest_notes
✓ guest_tags
✓ guest_embeddings

Features

✓ Guest Intelligence
✓ Career History
✓ Companies
✓ Books
✓ Interviews
✓ AI Generated Questions
✓ Notes
✓ Semantic Search
✓ Vector Embeddings
✓ RLS Enabled

Ready For

09_outlines.sql

=========================================================
*/
