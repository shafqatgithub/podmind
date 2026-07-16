CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS ltree;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
COMMENT ON EXTENSION "uuid-ossp"
IS 'UUID generation support';
COMMENT ON EXTENSION pgcrypto
IS 'Cryptographic functions';
COMMENT ON EXTENSION citext
IS 'Case-insensitive text';
COMMENT ON EXTENSION pg_trgm
IS 'Trigram similarity search';
COMMENT ON EXTENSION unaccent
IS 'Remove accents for full text search';
COMMENT ON EXTENSION vector
IS 'Vector embeddings for AI semantic search';
COMMENT ON EXTENSION hstore
IS 'Key-value data type';
COMMENT ON EXTENSION ltree
IS 'Hierarchical tree structures';
COMMENT ON EXTENSION pg_stat_statements
IS 'SQL query statistics';
CREATE TYPE user_role AS ENUM (
    'user',
    'pro',
    'business',
    'enterprise',
    'admin',
    'super_admin'
);
CREATE TYPE organization_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'member',
    'viewer'
);
CREATE TYPE workspace_role AS ENUM (
    'owner',
    'admin',
    'editor',
    'contributor',
    'viewer'
);
CREATE TYPE project_status AS ENUM (
    'draft',
    'research',
    'outline',
    'writing',
    'review',
    'published',
    'archived'
);
CREATE TYPE project_visibility AS ENUM (
    'private',
    'workspace',
    'organization',
    'public'
);
CREATE TYPE research_depth AS ENUM (
    'quick',
    'standard',
    'deep'
);
CREATE TYPE ai_provider AS ENUM (
    'openai',
    'anthropic',
    'google',
    'grok',
    'deepseek',
    'mistral',
    'ollama',
    'custom'
);
CREATE TYPE ai_model_category AS ENUM (
    'chat',
    'reasoning',
    'vision',
    'embedding',
    'speech',
    'image'
);
CREATE TYPE ai_task AS ENUM (
    'research',
    'guest',
    'outline',
    'script',
    'seo',
    'social',
    'summary',
    'fact_check',
    'translation',
    'chat'
);
CREATE TYPE ai_agent AS ENUM (
    'orchestrator',
    'research',
    'guest',
    'fact_checker',
    'outline',
    'script',
    'seo',
    'publisher',
    'analytics',
    'memory',
    'knowledge',
    'automation'
);
CREATE TYPE script_style AS ENUM (
    'solo',
    'interview',
    'educational',
    'storytelling',
    'business',
    'news',
    'casual'
);
CREATE TYPE content_tone AS ENUM (
    'professional',
    'friendly',
    'formal',
    'casual',
    'humorous',
    'motivational',
    'technical'
);
CREATE TYPE export_format AS ENUM (
    'pdf',
    'docx',
    'markdown',
    'html',
    'txt',
    'json'
);
CREATE TYPE social_platform AS ENUM (
    'linkedin',
    'x',
    'facebook',
    'instagram',
    'threads',
    'youtube',
    'newsletter'
);
CREATE TYPE subscription_plan AS ENUM (
    'free',
    'starter',
    'pro',
    'business',
    'enterprise'
);
CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled',
    'refunded'
);
CREATE TYPE billing_interval AS ENUM (
    'monthly',
    'yearly'
);
CREATE TYPE notification_type AS ENUM (
    'system',
    'project',
    'research',
    'billing',
    'security',
    'announcement',
    'marketing'
);
CREATE TYPE notification_status AS ENUM (
    'unread',
    'read',
    'archived'
);
CREATE TYPE file_type AS ENUM (
    'document',
    'image',
    'audio',
    'video',
    'export',
    'attachment'
);
CREATE TYPE language_code AS ENUM (
    'en',
    'ur',
    'ar',
    'fr',
    'de',
    'es',
    'it',
    'pt',
    'hi',
    'tr'
);
CREATE TYPE record_status AS ENUM (
    'active',
    'inactive',
    'deleted'
);
CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'share'
);
COMMENT ON TYPE user_role IS 'Application user roles';
COMMENT ON TYPE organization_role IS 'Organization permissions';
COMMENT ON TYPE workspace_role IS 'Workspace permissions';
COMMENT ON TYPE project_status IS 'Podcast project lifecycle';
COMMENT ON TYPE ai_provider IS 'Supported AI providers';
COMMENT ON TYPE ai_agent IS 'PodMind AI agents';
COMMENT ON TYPE subscription_plan IS 'Subscription plans';
COMMENT ON TYPE export_format IS 'Supported export formats';
CREATE TYPE memory_type AS ENUM (
    'fact',
    'preference',
    'context',
    'instruction',
    'summary',
    'insight'
);
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
    email CITEXT,
    full_name TEXT,
    username CITEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    company TEXT,
    job_title TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    language language_code DEFAULT 'en',
    role user_role DEFAULT 'user',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    theme TEXT DEFAULT 'dark',
    ai_provider ai_provider DEFAULT 'openai',
    default_language language_code DEFAULT 'en',
    writing_tone content_tone DEFAULT 'professional',
    auto_save BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE TABLE public.login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device TEXT,
    browser TEXT,
    operating_system TEXT,
    country TEXT,
    city TEXT,
    login_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    device_name TEXT,
    device_type TEXT,
    browser TEXT,
    operating_system TEXT,
    last_used_at TIMESTAMPTZ,
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    provider ai_provider NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    nickname TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profiles_username
ON public.profiles(username);
CREATE INDEX idx_profiles_role
ON public.profiles(role);
CREATE INDEX idx_login_history_user
ON public.login_history(user_id);
CREATE INDEX idx_devices_user
ON public.user_devices(user_id);
CREATE INDEX idx_api_keys_user
ON public.user_api_keys(user_id);
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_preferences_updated
BEFORE UPDATE
ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_api_keys_updated
BEFORE UPDATE
ON public.user_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.profiles(id, email, full_name, avatar_url)
VALUES(
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);
CREATE POLICY "Users manage own preferences"
ON public.user_preferences
FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users view own login history"
ON public.login_history
FOR SELECT
USING (auth.uid() = user_id);
CREATE POLICY "Users manage own devices"
ON public.user_devices
FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users manage own api keys"
ON public.user_api_keys
FOR ALL
USING (auth.uid() = user_id);
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
CREATE TABLE public.creator_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_profile_id UUID NOT NULL
        REFERENCES public.creator_profiles(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own creator profile"
ON public.creator_profiles
FOR ALL
USING (
    auth.uid() = user_id
);
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
CREATE POLICY "Users manage own onboarding"
ON public.user_onboarding
FOR ALL
USING (
    auth.uid() = user_id
);
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website_url TEXT,
    description TEXT,
    industry TEXT,
    company_size TEXT,
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    subscription_plan subscription_plan DEFAULT 'free',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    role organization_role DEFAULT 'member',
    invited_by UUID
        REFERENCES public.profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (organization_id, user_id)
);
CREATE TABLE public.organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    email CITEXT NOT NULL,
    role organization_role DEFAULT 'member',
    invite_token UUID DEFAULT gen_random_uuid(),
    invited_by UUID
        REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    allow_member_invites BOOLEAN DEFAULT TRUE,
    allow_public_projects BOOLEAN DEFAULT FALSE,
    default_language language_code DEFAULT 'en',
    default_ai_provider ai_provider DEFAULT 'openai',
    branding JSONB DEFAULT '{}'::jsonb,
    security JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.organization_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
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
CREATE INDEX idx_org_slug
ON public.organizations(slug);
CREATE INDEX idx_org_owner
ON public.organizations(owner_id);
CREATE INDEX idx_org_members_org
ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user
ON public.organization_members(user_id);
CREATE INDEX idx_org_invites_email
ON public.organization_invites(email);
CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE
ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_org_settings_updated
BEFORE UPDATE
ON public.organization_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members can view organizations"
ON public.organizations
FOR SELECT
USING (
    id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Organization owners can update organizations"
ON public.organizations
FOR UPDATE
USING (
    owner_id = auth.uid()
);
CREATE POLICY "Members can view organization members"
ON public.organization_members
FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Organization admins manage settings"
ON public.organization_settings
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.organization_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
);
ALTER TABLE public.profiles
    ADD COLUMN organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL;