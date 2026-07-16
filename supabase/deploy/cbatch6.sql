CREATE TABLE public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10,2) NOT NULL,
    yearly_price NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    ai_credits INTEGER DEFAULT 0,
    max_projects INTEGER,
    max_team_members INTEGER,
    max_storage_gb INTEGER,
    features JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    plan_id UUID NOT NULL
        REFERENCES public.subscription_plans(id),
    status TEXT DEFAULT 'trial',
    billing_cycle TEXT DEFAULT 'monthly',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMPTZ,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);
CREATE TABLE public.ai_credit_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    available_credits INTEGER DEFAULT 0,
    used_credits INTEGER DEFAULT 0,
    purchased_credits INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id)
);
CREATE TABLE public.ai_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL,
    description TEXT,
    related_request UUID
        REFERENCES public.ai_requests(id)
        ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    provider TEXT,
    provider_payment_method_id TEXT,
    brand TEXT,
    last4 TEXT,
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    invoice_number TEXT,
    amount NUMERIC(10,2),
    currency TEXT DEFAULT 'USD',
    status TEXT,
    invoice_url TEXT,
    pdf_url TEXT,
    issued_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.usage_metering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,
    resource TEXT,
    quantity NUMERIC(12,2),
    unit TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    event_name TEXT,
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subscription_org
ON public.organization_subscriptions(organization_id);
CREATE INDEX idx_credit_org
ON public.ai_credit_balances(organization_id);
CREATE INDEX idx_invoice_org
ON public.invoices(organization_id);
CREATE INDEX idx_usage_org
ON public.usage_metering(organization_id);
CREATE TRIGGER trg_subscription_updated
BEFORE UPDATE
ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_plan_updated
BEFORE UPDATE
ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_metering ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations manage subscriptions"
ON public.organization_subscriptions
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE TABLE public.analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.analytics_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL
        REFERENCES public.analytics_dashboards(id)
        ON DELETE CASCADE,
    widget_type TEXT NOT NULL,
    title TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE SET NULL,
    event_name TEXT NOT NULL,
    event_category TEXT,
    event_data JSONB DEFAULT '{}'::jsonb,
    session_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.analytics_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    metric_value NUMERIC(18,4),
    metric_unit TEXT,
    period TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.user_productivity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    scripts_created INTEGER DEFAULT 0,
    research_completed INTEGER DEFAULT 0,
    ai_requests INTEGER DEFAULT 0,
    exports_generated INTEGER DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    productivity_score NUMERIC(5,2),
    recorded_at DATE DEFAULT CURRENT_DATE
);
CREATE TABLE public.ai_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    provider_id UUID
        REFERENCES public.ai_providers(id)
        ON DELETE SET NULL,
    model_id UUID
        REFERENCES public.ai_models(id)
        ON DELETE SET NULL,
    total_requests INTEGER DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    total_cost NUMERIC(12,6),
    avg_latency_ms INTEGER,
    success_rate NUMERIC(5,2),
    recorded_at DATE DEFAULT CURRENT_DATE
);
CREATE TABLE public.feature_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT NOT NULL,
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    usage_count INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER,
    recorded_at DATE DEFAULT CURRENT_DATE
);
CREATE INDEX idx_analytics_events_org
ON public.analytics_events(organization_id);
CREATE INDEX idx_analytics_events_user
ON public.analytics_events(user_id);
CREATE INDEX idx_ai_analytics_org
ON public.ai_analytics(organization_id);
CREATE INDEX idx_feature_analytics
ON public.feature_analytics(feature_name);
CREATE TRIGGER trg_dashboard_updated
BEFORE UPDATE
ON public.analytics_dashboards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_widget_updated
BEFORE UPDATE
ON public.analytics_widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.analytics_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization analytics access"
ON public.analytics_dashboards
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    hashed_key TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    allowed_ips JSONB DEFAULT '[]'::jsonb,
    allowed_origins JSONB DEFAULT '[]'::jsonb,
    rate_limit_per_minute INTEGER DEFAULT 60,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL
        REFERENCES public.api_keys(id)
        ON DELETE CASCADE,
    access_token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE SET NULL,
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    request_size BIGINT,
    response_size BIGINT,
    ip_address INET,
    user_agent TEXT,
    request_id UUID DEFAULT gen_random_uuid(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    name TEXT,
    endpoint_url TEXT NOT NULL,
    secret TEXT,
    subscribed_events JSONB DEFAULT '[]'::jsonb,
    retry_attempts INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL
        REFERENCES public.api_webhooks(id)
        ON DELETE CASCADE,
    event_name TEXT,
    payload JSONB,
    response_code INTEGER,
    response_body TEXT,
    duration_ms INTEGER,
    attempts INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER DEFAULT 0,
    blocked_requests INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.api_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,
    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    performed_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_api_keys_org
ON public.api_keys(organization_id);
CREATE INDEX idx_api_logs_key
ON public.api_request_logs(api_key_id);
CREATE INDEX idx_api_logs_org
ON public.api_request_logs(organization_id);
CREATE INDEX idx_api_webhooks_org
ON public.api_webhooks(organization_id);
CREATE INDEX idx_api_rate_limits
ON public.api_rate_limits(api_key_id, window_start);
CREATE TRIGGER trg_api_keys_updated
BEFORE UPDATE
ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_api_webhooks_updated
BEFORE UPDATE
ON public.api_webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members manage API keys"
ON public.api_keys
FOR ALL
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.profiles
        WHERE id = auth.uid()
    )
);
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    role TEXT NOT NULL,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_super_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE TABLE public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL
        REFERENCES public.admin_users(id)
        ON DELETE CASCADE,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 100
        CHECK (rollout_percentage BETWEEN 0 AND 100),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE SET NULL,
    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,
    assigned_admin UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.system_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID
        REFERENCES public.admin_users(id)
        ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    status TEXT NOT NULL,
    response_time_ms INTEGER,
    uptime_percentage NUMERIC(5,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_user
ON public.admin_users(user_id);
CREATE INDEX idx_support_status
ON public.support_tickets(status);
CREATE INDEX idx_feature_flags
ON public.feature_flags(enabled);
CREATE INDEX idx_system_health
ON public.system_health(service_name);
CREATE TRIGGER trg_admin_users_updated
BEFORE UPDATE
ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_feature_flags_updated
BEFORE UPDATE
ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_support_updated
BEFORE UPDATE
ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only super admins can manage admin users"
ON public.admin_users
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.admin_users au
        WHERE au.user_id = auth.uid()
        AND au.is_super_admin = TRUE
        AND au.is_active = TRUE
    )
);