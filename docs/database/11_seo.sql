/*
=========================================================
 PodMind AI
 Database Migration
 File: 11_seo.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- SEO PROJECTS
---------------------------------------------------------

CREATE TABLE public.seo_projects (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    script_id UUID
        REFERENCES public.scripts(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,

    target_keyword TEXT,

    secondary_keywords JSONB DEFAULT '[]'::jsonb,

    search_intent TEXT,

    target_country TEXT,

    target_language language_code DEFAULT 'en',

    score INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_by UUID
        REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO KEYWORDS
---------------------------------------------------------

CREATE TABLE public.seo_keywords (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    keyword TEXT NOT NULL,

    search_volume INTEGER,

    keyword_difficulty NUMERIC(5,2),

    cpc NUMERIC(10,2),

    competition NUMERIC(5,2),

    intent TEXT,

    priority INTEGER DEFAULT 1,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO TITLES
---------------------------------------------------------

CREATE TABLE public.seo_titles (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    ai_generated BOOLEAN DEFAULT TRUE,

    seo_score INTEGER DEFAULT 0,

    click_score INTEGER DEFAULT 0,

    selected BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO DESCRIPTIONS
---------------------------------------------------------

CREATE TABLE public.seo_descriptions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    description TEXT,

    ai_generated BOOLEAN DEFAULT TRUE,

    seo_score INTEGER DEFAULT 0,

    selected BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO TAGS
---------------------------------------------------------

CREATE TABLE public.seo_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    tag TEXT,

    selected BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO CHAPTERS
---------------------------------------------------------

CREATE TABLE public.seo_chapters (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    title TEXT,

    timestamp_seconds INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO HASHTAGS
---------------------------------------------------------

CREATE TABLE public.seo_hashtags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    hashtag TEXT,

    popularity_score INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO CHECKLIST
---------------------------------------------------------

CREATE TABLE public.seo_checklists (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    item TEXT,

    completed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO COMPETITORS
---------------------------------------------------------

CREATE TABLE public.seo_competitors (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    channel_name TEXT,

    video_title TEXT,

    url TEXT,

    views BIGINT,

    subscribers BIGINT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SEO ANALYTICS
---------------------------------------------------------

CREATE TABLE public.seo_analytics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,

    seo_score INTEGER DEFAULT 0,

    readability_score INTEGER DEFAULT 0,

    keyword_density NUMERIC(5,2),

    estimated_ctr NUMERIC(5,2),

    estimated_rank INTEGER,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_seo_project
ON public.seo_projects(project_id);

CREATE INDEX idx_seo_script
ON public.seo_projects(script_id);

CREATE INDEX idx_keywords_project
ON public.seo_keywords(seo_project_id);

CREATE INDEX idx_titles_project
ON public.seo_titles(seo_project_id);

CREATE INDEX idx_descriptions_project
ON public.seo_descriptions(seo_project_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_seo_projects_updated

BEFORE UPDATE

ON public.seo_projects

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_analytics ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage SEO"

ON public.seo_projects

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

SEO Intelligence Module Complete

Tables

✓ seo_projects
✓ seo_keywords
✓ seo_titles
✓ seo_descriptions
✓ seo_tags
✓ seo_chapters
✓ seo_hashtags
✓ seo_checklists
✓ seo_competitors
✓ seo_analytics

Features

✓ Keyword Research
✓ AI SEO Titles
✓ AI Descriptions
✓ YouTube Tags
✓ Chapters Generator
✓ Hashtag Generator
✓ SEO Checklist
✓ Competitor Analysis
✓ SEO Scoring
✓ Enterprise Ready

Ready For

12_social.sql

=========================================================
*/
