/*
=========================================================
 PodMind AI
 Database Migration
 File: 20_templates.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- TEMPLATES
---------------------------------------------------------

CREATE TABLE public.templates (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    description TEXT,

    category TEXT,

    template_type TEXT NOT NULL,

    visibility project_visibility DEFAULT 'private',

    thumbnail_url TEXT,

    preview_url TEXT,

    version TEXT DEFAULT '1.0.0',

    is_featured BOOLEAN DEFAULT FALSE,

    is_verified BOOLEAN DEFAULT FALSE,

    download_count INTEGER DEFAULT 0,

    usage_count INTEGER DEFAULT 0,

    average_rating NUMERIC(3,2) DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- TEMPLATE CONTENT
---------------------------------------------------------

CREATE TABLE public.template_content (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
        REFERENCES public.templates(id)
        ON DELETE CASCADE,

    json_data JSONB NOT NULL,

    prompt_data JSONB DEFAULT '{}'::jsonb,

    settings JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- TEMPLATE CATEGORIES
---------------------------------------------------------

CREATE TABLE public.template_categories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT UNIQUE NOT NULL,

    slug CITEXT UNIQUE NOT NULL,

    description TEXT,

    icon TEXT,

    color TEXT,

    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- TEMPLATE FAVORITES
---------------------------------------------------------

CREATE TABLE public.template_favorites (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
        REFERENCES public.templates(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, user_id)

);

---------------------------------------------------------
-- TEMPLATE RATINGS
---------------------------------------------------------

CREATE TABLE public.template_ratings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
        REFERENCES public.templates(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),

    review TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, user_id)

);

---------------------------------------------------------
-- TEMPLATE DOWNLOADS
---------------------------------------------------------

CREATE TABLE public.template_downloads (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
        REFERENCES public.templates(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    downloaded_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- TEMPLATE VERSIONS
---------------------------------------------------------

CREATE TABLE public.template_versions (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    template_id UUID NOT NULL
        REFERENCES public.templates(id)
        ON DELETE CASCADE,

    version TEXT NOT NULL,

    changelog TEXT,

    json_snapshot JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_templates_slug
ON public.templates(slug);

CREATE INDEX idx_templates_category
ON public.templates(category);

CREATE INDEX idx_templates_featured
ON public.templates(is_featured);

CREATE INDEX idx_templates_verified
ON public.templates(is_verified);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_templates_updated
BEFORE UPDATE
ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_template_content_updated
BEFORE UPDATE
ON public.template_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Users can view public templates"

ON public.templates

FOR SELECT

USING (

    visibility = 'public'

    OR created_by = auth.uid()

);

CREATE POLICY "Users manage own templates"

ON public.templates

FOR ALL

USING (

    created_by = auth.uid()

);

COMMIT;

/*
=========================================================

Template Marketplace Complete

Tables

✓ templates
✓ template_content
✓ template_categories
✓ template_favorites
✓ template_ratings
✓ template_downloads
✓ template_versions

Features

✓ Template Marketplace
✓ Categories
✓ Ratings & Reviews
✓ Favorites
✓ Version History
✓ Public / Private Templates
✓ Featured Templates
✓ Enterprise Ready

Ready For

21_integrations.sql

=========================================================
*/
