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
ALTER TABLE public.outlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_talking_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outline_embeddings ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_exports ENABLE ROW LEVEL SECURITY;
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
CREATE TABLE public.seo_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,
    tag TEXT,
    selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.seo_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,
    title TEXT,
    timestamp_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.seo_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,
    hashtag TEXT,
    popularity_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.seo_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seo_project_id UUID NOT NULL
        REFERENCES public.seo_projects(id)
        ON DELETE CASCADE,
    item TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
CREATE TRIGGER trg_seo_projects_updated
BEFORE UPDATE
ON public.seo_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
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
CREATE TABLE public.social_post_hashtags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL
        REFERENCES public.social_posts(id)
        ON DELETE CASCADE,
    hashtag TEXT NOT NULL,
    popularity_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_ai_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
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
CREATE TABLE public.social_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);