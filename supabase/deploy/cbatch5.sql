CREATE TABLE public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    provider_type ai_provider NOT NULL,
    base_url TEXT,
    api_version TEXT,
    default_model TEXT,
    supports_streaming BOOLEAN DEFAULT TRUE,
    supports_tools BOOLEAN DEFAULT TRUE,
    supports_vision BOOLEAN DEFAULT FALSE,
    supports_audio BOOLEAN DEFAULT FALSE,
    supports_embeddings BOOLEAN DEFAULT TRUE,
    supports_json BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    display_name TEXT,
    model_family TEXT,
    context_window INTEGER,
    max_output_tokens INTEGER,
    input_price NUMERIC(12,6),
    output_price NUMERIC(12,6),
    embedding_dimensions INTEGER,
    supports_function_calling BOOLEAN DEFAULT TRUE,
    supports_reasoning BOOLEAN DEFAULT FALSE,
    supports_vision BOOLEAN DEFAULT FALSE,
    supports_audio BOOLEAN DEFAULT FALSE,
    supports_image_generation BOOLEAN DEFAULT FALSE,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.organization_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    default_provider_id UUID
        REFERENCES public.ai_providers(id),
    default_model_id UUID
        REFERENCES public.ai_models(id),
    fallback_provider_id UUID
        REFERENCES public.ai_providers(id),
    fallback_model_id UUID
        REFERENCES public.ai_models(id),
    temperature NUMERIC(3,2) DEFAULT 0.70,
    max_tokens INTEGER DEFAULT 4096,
    enable_streaming BOOLEAN DEFAULT TRUE,
    enable_fallback BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);
CREATE TABLE public.ai_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,
    key_name TEXT,
    encrypted_api_key TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,
    conversation_id UUID
        REFERENCES public.ai_conversations(id)
        ON DELETE SET NULL,
    provider_id UUID
        REFERENCES public.ai_providers(id),
    model_id UUID
        REFERENCES public.ai_models(id),
    task ai_task,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost NUMERIC(12,6),
    latency_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_provider_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL
        REFERENCES public.ai_providers(id)
        ON DELETE CASCADE,
    status TEXT,
    average_latency_ms INTEGER,
    success_rate NUMERIC(5,2),
    requests_today INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_provider_slug
ON public.ai_providers(slug);
CREATE INDEX idx_model_provider
ON public.ai_models(provider_id);
CREATE INDEX idx_requests_provider
ON public.ai_requests(provider_id);
CREATE INDEX idx_requests_model
ON public.ai_requests(model_id);
CREATE TRIGGER trg_ai_provider_updated
BEFORE UPDATE
ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_ai_settings_updated
BEFORE UPDATE
ON public.organization_ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_provider_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view providers"
ON public.ai_providers
FOR SELECT
USING (auth.role() = 'authenticated');
CREATE POLICY "Organizations manage AI settings"
ON public.organization_ai_settings
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE TABLE public.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    export_type export_format NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    status TEXT DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    file_name TEXT,
    file_url TEXT,
    file_size BIGINT,
    mime_type TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.export_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    export_type export_format,
    template_config JSONB DEFAULT '{}'::jsonb,
    is_system BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,
    downloaded_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    download_count INTEGER DEFAULT 1,
    downloaded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.export_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,
    share_token UUID DEFAULT gen_random_uuid(),
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    max_downloads INTEGER,
    current_downloads INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.export_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,
    priority INTEGER DEFAULT 1,
    worker_name TEXT,
    attempts INTEGER DEFAULT 0,
    status TEXT DEFAULT 'queued',
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
CREATE TABLE public.export_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,
    processing_time_ms INTEGER,
    compression_ratio NUMERIC(6,2),
    generated_pages INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_export_project
ON public.export_jobs(project_id);
CREATE INDEX idx_export_user
ON public.export_jobs(user_id);
CREATE INDEX idx_export_status
ON public.export_jobs(status);
CREATE INDEX idx_export_queue
ON public.export_queue(status);
CREATE TRIGGER trg_export_jobs_updated
BEFORE UPDATE
ON public.export_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_export_templates_updated
BEFORE UPDATE
ON public.export_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exports"
ON public.export_jobs
FOR ALL
USING (
    auth.uid() = user_id
);
CREATE POLICY "Users can view public templates"
ON public.export_templates
FOR SELECT
USING (
    is_public = TRUE
    OR is_system = TRUE
);
CREATE TABLE public.export_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    action_url TEXT,
    icon TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    marketing_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_start TIME,
    quiet_end TIME,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE TABLE public.push_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    platform TEXT,
    device_name TEXT,
    device_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_name TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    payload JSONB NOT NULL,
    delivery_status TEXT DEFAULT 'pending',
    response_code INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type notification_type,
    channel TEXT,
    subject TEXT,
    body TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID
        REFERENCES public.notifications(id)
        ON DELETE CASCADE,
    channel TEXT,
    status TEXT,
    provider TEXT,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user
ON public.notifications(user_id);
CREATE INDEX idx_notifications_read
ON public.notifications(is_read);
CREATE INDEX idx_email_queue_status
ON public.email_queue(status);
CREATE INDEX idx_webhooks_status
ON public.webhook_events(delivery_status);
CREATE TRIGGER trg_notification_preferences_updated
BEFORE UPDATE
ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_notification_templates_updated
BEFORE UPDATE
ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications"
ON public.notifications
FOR ALL
USING (
    auth.uid() = user_id
);
CREATE POLICY "Users manage own preferences"
ON public.notification_preferences
FOR ALL
USING (
    auth.uid() = user_id
);
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
CREATE INDEX idx_templates_slug
ON public.templates(slug);
CREATE INDEX idx_templates_category
ON public.templates(category);
CREATE INDEX idx_templates_featured
ON public.templates(is_featured);
CREATE INDEX idx_templates_verified
ON public.templates(is_verified);
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
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
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