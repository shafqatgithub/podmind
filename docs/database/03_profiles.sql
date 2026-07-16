/*
=========================================================
 PodMind AI
 Database Migration
 File: 03_profiles.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- CREATOR PROFILES
---------------------------------------------------------

CREATE TABLE public.creator_profiles (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    display_name TEXT NOT NULL,

    public_slug CITEXT UNIQUE,

    headline TEXT,

    about TEXT,

    profile_image_url TEXT,

    cover_image_url TEXT,

    website_url TEXT,

    podcast_name TEXT,

    podcast_description TEXT,

    industry TEXT,

    niche TEXT,

    audience_size INTEGER DEFAULT 0,

    country TEXT,

    city TEXT,

    is_public BOOLEAN DEFAULT TRUE,

    verified BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- SOCIAL LINKS
---------------------------------------------------------

CREATE TABLE public.social_links (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    creator_profile_id UUID NOT NULL
        REFERENCES public.creator_profiles(id)
        ON DELETE CASCADE,

    platform social_platform NOT NULL,

    profile_url TEXT NOT NULL,

    username TEXT,

    followers_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PODCAST SHOWS
---------------------------------------------------------

CREATE TABLE public.podcast_shows (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    creator_profile_id UUID NOT NULL
        REFERENCES public.creator_profiles(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    category TEXT,

    language language_code DEFAULT 'en',

    rss_feed_url TEXT,

    spotify_url TEXT,

    youtube_url TEXT,

    apple_podcast_url TEXT,

    website_url TEXT,

    total_episodes INTEGER DEFAULT 0,

    total_downloads BIGINT DEFAULT 0,

    status record_status DEFAULT 'active',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- PODCAST EPISODES
---------------------------------------------------------

CREATE TABLE public.podcast_episodes (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    podcast_show_id UUID NOT NULL
        REFERENCES public.podcast_shows(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    episode_number INTEGER,

    published_at TIMESTAMPTZ,

    duration_seconds INTEGER,

    audio_url TEXT,

    video_url TEXT,

    transcript_url TEXT,

    download_count INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- CREATOR ACHIEVEMENTS
---------------------------------------------------------

CREATE TABLE public.creator_achievements (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    creator_profile_id UUID NOT NULL
        REFERENCES public.creator_profiles(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    description TEXT,

    achieved_at DATE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- CREATOR TAGS
---------------------------------------------------------

CREATE TABLE public.creator_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    creator_profile_id UUID NOT NULL
        REFERENCES public.creator_profiles(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- ONBOARDING PROGRESS
---------------------------------------------------------

CREATE TABLE public.user_onboarding (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    current_step INTEGER DEFAULT 1,

    completed BOOLEAN DEFAULT FALSE,

    selected_industry TEXT,

    selected_niche TEXT,

    selected_ai_provider ai_provider,

    selected_tone content_tone,

    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_creator_profiles_user
ON public.creator_profiles(user_id);

CREATE INDEX idx_creator_profiles_slug
ON public.creator_profiles(public_slug);

CREATE INDEX idx_social_links_profile
ON public.social_links(creator_profile_id);

CREATE INDEX idx_podcast_shows_profile
ON public.podcast_shows(creator_profile_id);

CREATE INDEX idx_episodes_show
ON public.podcast_episodes(podcast_show_id);

---------------------------------------------------------
-- UPDATED_AT TRIGGERS
---------------------------------------------------------

CREATE TRIGGER trg_creator_profiles_updated
BEFORE UPDATE
ON public.creator_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_podcast_shows_updated
BEFORE UPDATE
ON public.podcast_shows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_podcast_episodes_updated
BEFORE UPDATE
ON public.podcast_episodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- RLS ENABLE
---------------------------------------------------------

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- CREATOR PROFILE POLICIES
---------------------------------------------------------

CREATE POLICY "Users manage own creator profile"
ON public.creator_profiles
FOR ALL
USING (
    auth.uid() = user_id
);

---------------------------------------------------------
-- SOCIAL LINKS POLICY
---------------------------------------------------------

CREATE POLICY "Users manage own social links"
ON public.social_links
FOR ALL
USING (
    creator_profile_id IN (
        SELECT id
        FROM public.creator_profiles
        WHERE user_id = auth.uid()
    )
);

---------------------------------------------------------
-- PODCAST SHOWS POLICY
---------------------------------------------------------

CREATE POLICY "Users manage own podcast shows"
ON public.podcast_shows
FOR ALL
USING (
    creator_profile_id IN (
        SELECT id
        FROM public.creator_profiles
        WHERE user_id = auth.uid()
    )
);

---------------------------------------------------------
-- USER ONBOARDING POLICY
---------------------------------------------------------

CREATE POLICY "Users manage own onboarding"
ON public.user_onboarding
FOR ALL
USING (
    auth.uid() = user_id
);

COMMIT;

/*
=========================================================
Creator Profile Module Complete

Tables

✓ creator_profiles
✓ social_links
✓ podcast_shows
✓ podcast_episodes
✓ creator_achievements
✓ creator_tags
✓ user_onboarding

Features

✓ Public Creator Profile
✓ Podcast Shows
✓ Episodes Tracking
✓ Social Media Links
✓ Creator Achievements
✓ Tags System
✓ Onboarding Progress
✓ RLS Protected

Ready For

04_organizations.sql
=========================================================
*/
