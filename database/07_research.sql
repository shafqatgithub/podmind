/*
=========================================================
 PodMind AI
 Database Migration
 File: 07_research.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- RESEARCH SESSIONS
---------------------------------------------------------

CREATE TABLE public.research_sessions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id),

    title TEXT NOT NULL,

    topic TEXT NOT NULL,

    objective TEXT,

    depth research_depth DEFAULT 'standard',

    status record_status DEFAULT 'active',

    ai_provider ai_provider DEFAULT 'openai',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH RESULTS
---------------------------------------------------------

CREATE TABLE public.research_results (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.research_sessions(id)
        ON DELETE CASCADE,

    ai_agent ai_agent DEFAULT 'research',

    title TEXT,

    summary TEXT,

    content TEXT,

    confidence_score NUMERIC(5,2),

    token_usage INTEGER,

    processing_time_ms INTEGER,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH SOURCES
---------------------------------------------------------

CREATE TABLE public.research_sources (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    result_id UUID NOT NULL
        REFERENCES public.research_results(id)
        ON DELETE CASCADE,

    title TEXT,

    source_type TEXT,

    url TEXT,

    author TEXT,

    published_at TIMESTAMPTZ,

    credibility_score NUMERIC(5,2),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH QUESTIONS
---------------------------------------------------------

CREATE TABLE public.research_questions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.research_sessions(id)
        ON DELETE CASCADE,

    question TEXT NOT NULL,

    answer TEXT,

    ai_provider ai_provider,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH CITATIONS
---------------------------------------------------------

CREATE TABLE public.research_citations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    result_id UUID NOT NULL
        REFERENCES public.research_results(id)
        ON DELETE CASCADE,

    citation TEXT,

    source_url TEXT,

    page_reference TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH BOOKMARKS
---------------------------------------------------------

CREATE TABLE public.research_bookmarks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    result_id UUID NOT NULL
        REFERENCES public.research_results(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(result_id, user_id)

);

---------------------------------------------------------
-- RESEARCH TAGS
---------------------------------------------------------

CREATE TABLE public.research_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.research_sessions(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH FILES
---------------------------------------------------------

CREATE TABLE public.research_files (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES public.research_sessions(id)
        ON DELETE CASCADE,

    uploaded_by UUID
        REFERENCES public.profiles(id),

    file_name TEXT,

    file_url TEXT,

    file_type file_type,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- RESEARCH EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.research_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    result_id UUID NOT NULL
        REFERENCES public.research_results(id)
        ON DELETE CASCADE,

    embedding vector(1536),

    chunk_text TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_research_project
ON public.research_sessions(project_id);

CREATE INDEX idx_research_topic
ON public.research_sessions(topic);

CREATE INDEX idx_research_result
ON public.research_results(session_id);

CREATE INDEX idx_research_sources
ON public.research_sources(result_id);

CREATE INDEX idx_research_question
ON public.research_questions(session_id);

CREATE INDEX idx_research_embedding
ON public.research_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_research_updated

BEFORE UPDATE

ON public.research_sessions

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_embeddings ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage research"

ON public.research_sessions

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

Research Module Complete

Tables

✓ research_sessions
✓ research_results
✓ research_sources
✓ research_questions
✓ research_citations
✓ research_bookmarks
✓ research_tags
✓ research_files
✓ research_embeddings

Features

✓ AI Research Sessions
✓ Deep Research
✓ Source Tracking
✓ Citations
✓ Questions
✓ Attachments
✓ Semantic Search
✓ Vector Embeddings
✓ RLS Enabled

Ready For

08_guests.sql

=========================================================
*/
