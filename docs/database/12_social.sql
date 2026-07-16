/*
=========================================================
 PodMind AI
 Database Migration
File: 12_social.sql
Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- SOCIAL CAMPAIGNS
---------------------------------------------------------

CREATE TABLE public.social_campaigns (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    script_id UUID
        REFERENCES public.scripts(id)
        ON DELETE SET NULL,

    title TEXT NOT NULL,

    description TEXT,

    status project_status DEFAULT 'draft',

    created_by UUID
        REFERENCES public.profiles(id),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL POSTS
---------------------------------------------------------

CREATE TABLE public.social_posts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES public.social_campaigns(id)
        ON DELETE CASCADE,

    platform social_platform NOT NULL,

    title TEXT,

    content TEXT,

    media_url TEXT,

    thumbnail_url TEXT,

    character_count INTEGER DEFAULT 0,

    word_count INTEGER DEFAULT 0,

    ai_generated BOOLEAN DEFAULT TRUE,

    status project_status DEFAULT 'draft',

    scheduled_at TIMESTAMPTZ,

    published_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL PLATFORM ACCOUNTS
---------------------------------------------------------

CREATE TABLE public.social_accounts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    platform social_platform NOT NULL,

    account_name TEXT,

    username TEXT,

    profile_url TEXT,

    access_token TEXT,

    refresh_token TEXT,

    expires_at TIMESTAMPTZ,

    is_connected BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, platform)

);

---------------------------------------------------------
-- SOCIAL HASHTAGS
---------------------------------------------------------

CREATE TABLE public.social_post_hashtags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,

    hashtag TEXT NOT NULL,

    popularity_score INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL MEDIA FILES
---------------------------------------------------------

CREATE TABLE public.social_assets (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES public.social_campaigns(id)
        ON DELETE CASCADE,

    asset_name TEXT,

    asset_type file_type,

    asset_url TEXT,

    file_size BIGINT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL SCHEDULE
---------------------------------------------------------

CREATE TABLE public.social_schedule (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,

    platform social_platform,

    scheduled_time TIMESTAMPTZ,

    timezone TEXT DEFAULT 'UTC',

    status TEXT DEFAULT 'scheduled',

    retry_count INTEGER DEFAULT 0,

    published BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL ANALYTICS
---------------------------------------------------------

CREATE TABLE public.social_analytics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,

    impressions BIGINT DEFAULT 0,

    reach BIGINT DEFAULT 0,

    likes BIGINT DEFAULT 0,

    comments BIGINT DEFAULT 0,

    shares BIGINT DEFAULT 0,

    saves BIGINT DEFAULT 0,

    clicks BIGINT DEFAULT 0,

    engagement_rate NUMERIC(8,2),

    watch_time_seconds BIGINT,

    metadata JSONB DEFAULT '{}'::jsonb,

    collected_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL AI VARIATIONS
---------------------------------------------------------

CREATE TABLE public.social_ai_variations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,

    variation_name TEXT,

    content TEXT,

    tone content_tone,

    ai_provider ai_provider,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- SOCIAL COMMENTS
---------------------------------------------------------

CREATE TABLE public.social_comments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id),

    comment TEXT,

    resolved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_social_campaign_project
ON public.social_campaigns(project_id);

CREATE INDEX idx_social_posts_campaign
ON public.social_posts(campaign_id);

CREATE INDEX idx_social_platform
ON public.social_posts(platform);

CREATE INDEX idx_social_schedule
ON public.social_schedule(post_id);

CREATE INDEX idx_social_analytics
ON public.social_analytics(post_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_social_campaign_updated
BEFORE UPDATE
ON public.social_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_social_post_updated
BEFORE UPDATE
ON public.social_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_ai_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage social campaigns"

ON public.social_campaigns

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

Social Media Studio Module Complete

Tables

✓ social_campaigns
✓ social_posts
✓ social_accounts
✓ social_post_hashtags
✓ social_assets
✓ social_schedule
✓ social_analytics
✓ social_ai_variations
✓ social_comments

Features

✓ AI Social Writer
✓ Multi Platform Support
✓ Content Variations
✓ Scheduling
✓ Publishing Queue
✓ Media Library
✓ Analytics
✓ Engagement Tracking
✓ Collaboration
✓ Enterprise Ready

Ready For

13_ai_chat.sql

=========================================================
*/
