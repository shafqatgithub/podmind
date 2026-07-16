CREATE TABLE public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug CITEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    color TEXT DEFAULT '#6366F1',
    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    visibility project_visibility DEFAULT 'private',
    is_default BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (organization_id, slug)
);
CREATE TABLE public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    role workspace_role DEFAULT 'contributor',
    invited_by UUID
        REFERENCES public.profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (workspace_id, user_id)
);
CREATE TABLE public.workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    email CITEXT NOT NULL,
    role workspace_role DEFAULT 'viewer',
    invite_token UUID DEFAULT gen_random_uuid(),
    invited_by UUID
        REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    default_ai_provider ai_provider DEFAULT 'openai',
    default_language language_code DEFAULT 'en',
    auto_save BOOLEAN DEFAULT TRUE,
    allow_exports BOOLEAN DEFAULT TRUE,
    allow_guest_access BOOLEAN DEFAULT FALSE,
    branding JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.workspace_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
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
CREATE TABLE public.workspace_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366F1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);
CREATE INDEX idx_workspace_org
ON public.workspaces(organization_id);
CREATE INDEX idx_workspace_owner
ON public.workspaces(owner_id);
CREATE INDEX idx_workspace_slug
ON public.workspaces(slug);
CREATE INDEX idx_workspace_member_user
ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_member_workspace
ON public.workspace_members(workspace_id);
CREATE TRIGGER trg_workspaces_updated
BEFORE UPDATE
ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_workspace_settings_updated
BEFORE UPDATE
ON public.workspace_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace members can view workspaces"
ON public.workspaces
FOR SELECT
USING (
    id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Workspace owners can update workspaces"
ON public.workspaces
FOR UPDATE
USING (
    owner_id = auth.uid()
);
CREATE POLICY "Workspace members can view members"
ON public.workspace_members
FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Workspace admins manage settings"
ON public.workspace_settings
FOR ALL
USING (
    workspace_id IN (
        SELECT workspace_id
        FROM public.workspace_members
        WHERE user_id = auth.uid()
        AND role IN ('owner','admin')
    )
);
CREATE TABLE public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    owner_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    title TEXT NOT NULL,
    slug CITEXT,
    description TEXT,
    thumbnail_url TEXT,
    status project_status DEFAULT 'draft',
    visibility project_visibility DEFAULT 'private',
    language language_code DEFAULT 'en',
    category TEXT,
    niche TEXT,
    audience TEXT,
    podcast_name TEXT,
    cover_image TEXT,
    color TEXT DEFAULT '#6366F1',
    icon TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_template BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, slug)
);
CREATE TABLE public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    role workspace_role DEFAULT 'viewer',
    invited_by UUID
        REFERENCES public.profiles(id),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
CREATE TABLE public.project_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    color TEXT DEFAULT '#6366F1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    uploaded_by UUID
        REFERENCES public.profiles(id),
    file_name TEXT NOT NULL,
    file_type file_type,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.project_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id),
    title TEXT,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.project_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id),
    action audit_action,
    entity_type TEXT,
    entity_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.project_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
CREATE TABLE public.project_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    created_by UUID
        REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_workspace
ON public.projects(workspace_id);
CREATE INDEX idx_projects_owner
ON public.projects(owner_id);
CREATE INDEX idx_projects_status
ON public.projects(status);
CREATE INDEX idx_projects_slug
ON public.projects(slug);
CREATE INDEX idx_project_members_project
ON public.project_members(project_id);
CREATE INDEX idx_project_members_user
ON public.project_members(user_id);
CREATE TRIGGER trg_projects_updated
BEFORE UPDATE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_project_notes_updated
BEFORE UPDATE
ON public.project_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Project members can access projects"
ON public.projects
FOR ALL
USING (
    id IN (
        SELECT project_id
        FROM public.project_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Members can view project members"
ON public.project_members
FOR SELECT
USING (
    project_id IN (
        SELECT project_id
        FROM public.project_members
        WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Members manage project notes"
ON public.project_notes
FOR ALL
USING (
    project_id IN (
        SELECT project_id
        FROM public.project_members
        WHERE user_id = auth.uid()
    )
);
CREATE TABLE public.project_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
CREATE TABLE public.research_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES public.research_sessions(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
CREATE TRIGGER trg_research_updated
BEFORE UPDATE
ON public.research_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_embeddings ENABLE ROW LEVEL SECURITY;
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
CREATE TABLE public.guest_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL
        REFERENCES public.guests(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_embeddings ENABLE ROW LEVEL SECURITY;
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