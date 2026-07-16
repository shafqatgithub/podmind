CREATE TABLE public.marketplace_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    item_type TEXT NOT NULL,
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    short_description TEXT,
    description TEXT,
    category TEXT,
    thumbnail_url TEXT,
    banner_url TEXT,
    version TEXT DEFAULT '1.0.0',
    price NUMERIC(10,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    visibility project_visibility DEFAULT 'public',
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.marketplace_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.marketplace_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,
    buyer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,
    amount NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    payment_status TEXT DEFAULT 'completed',
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.marketplace_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    rating INTEGER NOT NULL
        CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);
CREATE TABLE public.marketplace_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(item_id, user_id)
);
CREATE TABLE public.marketplace_downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    downloaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.marketplace_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.marketplace_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL
        REFERENCES public.marketplace_collections(id)
        ON DELETE CASCADE,
    item_id UUID NOT NULL
        REFERENCES public.marketplace_items(id)
        ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(collection_id, item_id)
);
CREATE TABLE public.marketplace_creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    website TEXT,
    avatar_url TEXT,
    verified BOOLEAN DEFAULT FALSE,
    total_sales INTEGER DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE INDEX idx_marketplace_slug
ON public.marketplace_items(slug);
CREATE INDEX idx_marketplace_category
ON public.marketplace_items(category);
CREATE INDEX idx_marketplace_featured
ON public.marketplace_items(is_featured);
CREATE INDEX idx_marketplace_verified
ON public.marketplace_items(is_verified);
CREATE TRIGGER trg_marketplace_items_updated
BEFORE UPDATE
ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view public marketplace items"
ON public.marketplace_items
FOR SELECT
USING (
    visibility = 'public'
    OR created_by = auth.uid()
);
CREATE POLICY "Creators manage own marketplace items"
ON public.marketplace_items
FOR ALL
USING (
    created_by = auth.uid()
);
CREATE TABLE public.enterprise_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    company_name TEXT,
    domain TEXT,
    sso_enabled BOOLEAN DEFAULT FALSE,
    scim_enabled BOOLEAN DEFAULT FALSE,
    audit_logs_enabled BOOLEAN DEFAULT TRUE,
    ip_whitelist JSONB DEFAULT '[]'::jsonb,
    allowed_email_domains JSONB DEFAULT '[]'::jsonb,
    data_retention_days INTEGER DEFAULT 365,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);
CREATE TABLE public.organization_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    domain TEXT UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.sso_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    provider_type TEXT NOT NULL,
    client_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.scim_provisioning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    bearer_token_hash TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    event_type TEXT,
    severity TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    actor_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    action TEXT,
    resource_type TEXT,
    resource_id UUID,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.enterprise_data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    requested_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    export_type TEXT,
    status TEXT DEFAULT 'pending',
    file_url TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE TABLE public.compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    report_type TEXT,
    report_url TEXT,
    generated_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_enterprise_org
ON public.enterprise_settings(organization_id);
CREATE INDEX idx_security_org
ON public.security_events(organization_id);
CREATE INDEX idx_audit_org
ON public.audit_events(organization_id);
CREATE TRIGGER trg_enterprise_updated
BEFORE UPDATE
ON public.enterprise_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sso_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scim_provisioning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enterprise members access settings"
ON public.enterprise_settings
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE TABLE public.vector_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    workspace_id UUID
        REFERENCES public.workspaces(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    title TEXT NOT NULL,
    document_type TEXT NOT NULL,
    source TEXT,
    source_url TEXT,
    language TEXT DEFAULT 'en',
    checksum TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.vector_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES public.vector_documents(id)
        ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);
CREATE TABLE public.embedding_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID
        REFERENCES public.vector_documents(id)
        ON DELETE CASCADE,
    provider_id UUID
        REFERENCES public.ai_providers(id)
        ON DELETE SET NULL,
    model_name TEXT,
    status TEXT DEFAULT 'pending',
    chunks_total INTEGER DEFAULT 0,
    chunks_completed INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.vector_search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,
    query TEXT NOT NULL,
    top_k INTEGER DEFAULT 10,
    provider TEXT,
    latency_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.knowledge_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.collection_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL
        REFERENCES public.knowledge_collections(id)
        ON DELETE CASCADE,
    document_id UUID NOT NULL
        REFERENCES public.vector_documents(id)
        ON DELETE CASCADE,
    UNIQUE(collection_id, document_id)
);
CREATE INDEX idx_vector_documents_project
ON public.vector_documents(project_id);
CREATE INDEX idx_vector_chunks_document
ON public.vector_chunks(document_id);
CREATE INDEX idx_vector_embedding
ON public.vector_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
CREATE TRIGGER trg_vector_documents_updated
BEFORE UPDATE
ON public.vector_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.vector_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members access vectors"
ON public.vector_documents
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_org
ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug
ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_org
ON public.workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace
ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_status
ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner
ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_research_project
ON public.research_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_research_status
ON public.research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_guests_project
ON public.guests(project_id);
CREATE INDEX IF NOT EXISTS idx_guests_email
ON public.guests(email);
CREATE INDEX IF NOT EXISTS idx_outlines_project
ON public.outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_scripts_project
ON public.scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_project
ON public.seo_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_social_campaign
ON public.social_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_project
ON public.ai_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_provider
ON public.ai_requests(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created
ON public.ai_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_memories_project
ON public.ai_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_project
ON public.knowledge_bases(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_project
ON public.export_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_exports_status
ON public.export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created
ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_status
ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_usage_recorded
ON public.usage_metering(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_created
ON public.api_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created
ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vector_chunks_chunk
ON public.vector_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_scripts_fts
ON public.scripts
USING GIN (
    to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(content,''))
);
CREATE INDEX IF NOT EXISTS idx_research_fts
ON public.research_sessions
USING GIN (
    to_tsvector('english', COALESCE(title,'') || ' ' || COALESCE(topic,''))
);
CREATE INDEX IF NOT EXISTS idx_guests_fts
ON public.guests
USING GIN (
    to_tsvector('english',
        COALESCE(full_name,'') || ' ' ||
        COALESCE(company,'') || ' ' ||
        COALESCE(biography,'')
    )
);
CREATE INDEX IF NOT EXISTS idx_projects_metadata
ON public.projects
USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_ai_requests_metadata
ON public.ai_requests
USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_vector_metadata
ON public.vector_documents
USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_project_user_status
ON public.projects(
    owner_id,
    status,
    updated_at DESC
);
CREATE INDEX IF NOT EXISTS idx_ai_provider_created
ON public.ai_requests(
    provider_id,
    created_at DESC
);
CREATE INDEX IF NOT EXISTS idx_notification_user_read
ON public.notifications(
    user_id,
    is_read,
    created_at DESC
);
ANALYZE;