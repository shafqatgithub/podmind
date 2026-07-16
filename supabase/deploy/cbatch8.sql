CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.generate_slug(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    slug TEXT;
BEGIN
    slug := lower(trim(input));
    slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
    slug := regexp_replace(slug, '-+', '-', 'g');
    slug := trim(both '-' FROM slug);
    RETURN slug;
END;
$$;
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN
        'pm_' ||
        encode(gen_random_bytes(24), 'hex');
END;
$$;
CREATE OR REPLACE FUNCTION public.generate_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;
CREATE OR REPLACE FUNCTION public.word_count(input TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT
CASE
WHEN input IS NULL THEN 0
ELSE
array_length(
regexp_split_to_array(trim(input), '\s+'),
1)
END;
$$;
CREATE OR REPLACE FUNCTION public.reading_time_minutes(input TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
words INTEGER;
BEGIN
words := public.word_count(input);
RETURN GREATEST(1, CEIL(words / 200.0));
END;
$$;
CREATE OR REPLACE FUNCTION public.speaking_time_minutes(input TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
words INTEGER;
BEGIN
words := public.word_count(input);
RETURN GREATEST(1, CEIL(words / 150.0));
END;
$$;
CREATE OR REPLACE FUNCTION public.search_vector(
title TEXT,
body TEXT
)
RETURNS tsvector
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT
to_tsvector(
'english',
coalesce(title,'') || ' ' ||
coalesce(body,'')
);
$$;
CREATE OR REPLACE FUNCTION public.jsonb_merge(
a JSONB,
b JSONB
)
RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
AS $$
SELECT
coalesce(a,'{}'::jsonb)
||
coalesce(b,'{}'::jsonb);
$$;
CREATE OR REPLACE FUNCTION public.organization_storage_size(
org UUID
)
RETURNS BIGINT
LANGUAGE SQL
AS $$
SELECT
COALESCE(
SUM(file_size),
0
)
FROM public.export_jobs
WHERE organization_id = org;
$$;
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
SELECT EXISTS(
SELECT 1
FROM public.admin_users
WHERE user_id = auth.uid()
AND is_active = TRUE
);
$$;
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
SELECT EXISTS(
SELECT 1
FROM public.admin_users
WHERE user_id = auth.uid()
AND is_super_admin = TRUE
);
$$;
CREATE OR REPLACE FUNCTION public.available_ai_credits(
org UUID
)
RETURNS INTEGER
LANGUAGE SQL
AS $$
SELECT available_credits
FROM public.ai_credit_balances
WHERE organization_id = org;
$$;
CREATE OR REPLACE FUNCTION public.auto_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
IF NEW.slug IS NULL THEN
NEW.slug := public.generate_slug(NEW.name);
END IF;
RETURN NEW;
END;
$$;
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
INSERT INTO public.audit_events(
organization_id,
actor_id,
action,
resource_type,
resource_id,
changes
)
VALUES(
NEW.organization_id,
auth.uid(),
TG_OP,
TG_TABLE_NAME,
NEW.id,
to_jsonb(NEW)
);
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
BEFORE UPDATE
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_organizations_updated ON public.organizations;
CREATE TRIGGER trg_organizations_updated
BEFORE UPDATE
ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_workspaces_updated ON public.workspaces;
CREATE TRIGGER trg_workspaces_updated
BEFORE UPDATE
ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_projects_updated ON public.projects;
CREATE TRIGGER trg_projects_updated
BEFORE UPDATE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_projects_slug ON public.projects;
CREATE TRIGGER trg_projects_slug
BEFORE INSERT
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();
DROP TRIGGER IF EXISTS trg_templates_slug ON public.templates;
CREATE TRIGGER trg_templates_slug
BEFORE INSERT
ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();
DROP TRIGGER IF EXISTS trg_marketplace_slug ON public.marketplace_items;
CREATE TRIGGER trg_marketplace_slug
BEFORE INSERT
ON public.marketplace_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();
DROP TRIGGER IF EXISTS trg_projects_audit ON public.projects;
CREATE TRIGGER trg_projects_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();
DROP TRIGGER IF EXISTS trg_billing_audit ON public.organization_subscriptions;
CREATE TRIGGER trg_billing_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.organization_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();
DROP TRIGGER IF EXISTS trg_api_keys_audit ON public.api_keys;
CREATE TRIGGER trg_api_keys_audit
AFTER INSERT OR UPDATE OR DELETE
ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.audit_trigger();
CREATE OR REPLACE FUNCTION public.update_ai_credit_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE public.ai_credit_balances
SET
available_credits = available_credits - NEW.amount,
used_credits = used_credits + NEW.amount,
updated_at = NOW()
WHERE organization_id = NEW.organization_id
AND NEW.transaction_type = 'usage';
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_ai_credit_usage ON public.ai_credit_transactions;
CREATE TRIGGER trg_ai_credit_usage
AFTER INSERT
ON public.ai_credit_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_credit_usage();
CREATE OR REPLACE FUNCTION public.increment_template_downloads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE public.templates
SET download_count = download_count + 1
WHERE id = NEW.template_id;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_template_download ON public.template_downloads;
CREATE TRIGGER trg_template_download
AFTER INSERT
ON public.template_downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_template_downloads();
CREATE OR REPLACE FUNCTION public.increment_marketplace_downloads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE public.marketplace_items
SET metadata =
jsonb_set(
metadata,
'{downloads}',
to_jsonb(
COALESCE((metadata->>'downloads')::INTEGER,0)+1
)
)
WHERE id = NEW.item_id;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_marketplace_download ON public.marketplace_downloads;
CREATE TRIGGER trg_marketplace_download
AFTER INSERT
ON public.marketplace_downloads
FOR EACH ROW
EXECUTE FUNCTION public.increment_marketplace_downloads();
CREATE OR REPLACE FUNCTION public.mark_notification_read()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
IF NEW.is_read = TRUE
AND OLD.is_read = FALSE THEN
NEW.read_at := NOW();
END IF;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notification_read ON public.notifications;
CREATE TRIGGER trg_notification_read
BEFORE UPDATE
ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.mark_notification_read();
CREATE OR REPLACE FUNCTION public.refresh_template_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE public.templates
SET average_rating = (
SELECT ROUND(AVG(rating)::numeric,2)
FROM public.template_ratings
WHERE template_id = NEW.template_id
)
WHERE id = NEW.template_id;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_template_rating ON public.template_ratings;
CREATE TRIGGER trg_template_rating
AFTER INSERT OR UPDATE
ON public.template_ratings
FOR EACH ROW
EXECUTE FUNCTION public.refresh_template_rating();
CREATE OR REPLACE FUNCTION public.refresh_marketplace_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
UPDATE public.marketplace_items
SET metadata =
jsonb_set(
metadata,
'{average_rating}',
to_jsonb(
(
SELECT ROUND(AVG(rating)::numeric,2)
FROM public.marketplace_reviews
WHERE item_id = NEW.item_id
)
)
)
WHERE id = NEW.item_id;
RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_marketplace_rating ON public.marketplace_reviews;
CREATE TRIGGER trg_marketplace_rating
AFTER INSERT OR UPDATE
ON public.marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION public.refresh_marketplace_rating();
CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
SELECT organization_id
FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.is_organization_member(org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = org
);
$$;
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;
CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);
CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
USING (
    id = auth.uid()
);
DROP POLICY IF EXISTS organizations_select
ON public.organizations;
CREATE POLICY organizations_select
ON public.organizations
FOR SELECT
USING (
id = public.current_organization_id()
);
DROP POLICY IF EXISTS workspaces_access
ON public.workspaces;
CREATE POLICY workspaces_access
ON public.workspaces
FOR ALL
USING (
public.is_organization_member(organization_id)
);
DROP POLICY IF EXISTS projects_access
ON public.projects;
CREATE POLICY projects_access
ON public.projects
FOR ALL
USING (
public.is_organization_member(
    (SELECT w.organization_id
       FROM public.workspaces w
      WHERE w.id = workspace_id)
)
);
DROP POLICY IF EXISTS research_access
ON public.research_sessions;
CREATE POLICY research_access
ON public.research_sessions
FOR ALL
USING (
EXISTS (
SELECT 1
FROM public.projects p
WHERE p.id = project_id
AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = p.workspace_id))
)
);
DROP POLICY IF EXISTS guests_access
ON public.guests;
CREATE POLICY guests_access
ON public.guests
FOR ALL
USING (
EXISTS (
SELECT 1
FROM public.projects
WHERE projects.id = guests.project_id
AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))
)
);
DROP POLICY IF EXISTS outlines_access
ON public.outlines;
CREATE POLICY outlines_access
ON public.outlines
FOR ALL
USING (
EXISTS (
SELECT 1
FROM public.projects
WHERE projects.id = outlines.project_id
AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))
)
);
DROP POLICY IF EXISTS scripts_access
ON public.scripts;
CREATE POLICY scripts_access
ON public.scripts
FOR ALL
USING (
EXISTS (
SELECT 1
FROM public.projects
WHERE projects.id = scripts.project_id
AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))
)
);
DROP POLICY IF EXISTS knowledge_access
ON public.knowledge_bases;
CREATE POLICY knowledge_access
ON public.knowledge_bases
FOR ALL
USING (
EXISTS (
SELECT 1
FROM public.projects
WHERE projects.id = knowledge_bases.project_id
AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))
)
);
DROP POLICY IF EXISTS ai_memory_access
ON public.ai_memories;
CREATE POLICY ai_memory_access
ON public.ai_memories
FOR ALL
USING (
user_id = auth.uid()
);
DROP POLICY IF EXISTS exports_access
ON public.export_jobs;
CREATE POLICY exports_access
ON public.export_jobs
FOR ALL
USING (
public.is_organization_member(organization_id)
);
DROP POLICY IF EXISTS marketplace_public
ON public.marketplace_items;
CREATE POLICY marketplace_public
ON public.marketplace_items
FOR SELECT
USING (
visibility='public'
OR created_by=auth.uid()
);
DROP POLICY IF EXISTS admin_only
ON public.admin_users;
CREATE POLICY admin_only
ON public.admin_users
FOR ALL
USING (
public.is_super_admin()
);
DROP POLICY IF EXISTS api_keys_access
ON public.api_keys;
CREATE POLICY api_keys_access
ON public.api_keys
FOR ALL
USING (
public.is_organization_member(organization_id)
);
DROP POLICY IF EXISTS billing_access
ON public.organization_subscriptions;
CREATE POLICY billing_access
ON public.organization_subscriptions
FOR ALL
USING (
public.is_organization_member(organization_id)
);
DROP POLICY IF EXISTS vector_documents_access
ON public.vector_documents;
CREATE POLICY vector_documents_access
ON public.vector_documents
FOR ALL
USING (
public.is_organization_member(organization_id)
);
INSERT INTO public.subscription_plans
(name, slug, monthly_price, yearly_price, ai_credits, max_team_members, max_projects)
VALUES
('Free', 'free', 0, 0, 5000, 1, 3),
('Starter', 'starter', 19, 190, 50000, 5, 25),
('Pro', 'pro', 49, 490, 250000, 20, 100),
('Business', 'business', 99, 990, 1000000, 100, 500),
('Enterprise', 'enterprise', 0, 0, 999999999, 999999, 999999)
ON CONFLICT DO NOTHING;
INSERT INTO public.ai_providers
(name, slug, provider_type, is_active)
VALUES
('OpenAI','openai','openai',TRUE),
('Google Gemini','gemini','google',TRUE),
('Anthropic Claude','claude','anthropic',TRUE),
('Mistral AI','mistral','mistral',TRUE),
('xAI Grok','grok','grok',TRUE),
('DeepSeek','deepseek','deepseek',TRUE),
('OpenRouter','openrouter','custom',TRUE),
('Azure OpenAI','azure-openai','custom',FALSE),
('AWS Bedrock','bedrock','custom',FALSE)
ON CONFLICT DO NOTHING;
INSERT INTO public.ai_models
(provider_id, model_name, context_window)
SELECT p.id, v.model_name, v.context_window
FROM (VALUES
    ('openai','gpt-5',400000),
    ('openai','gpt-5-mini',400000),
    ('gemini','gemini-2.5-pro',1000000),
    ('gemini','gemini-2.5-flash',1000000),
    ('claude','claude-opus',200000),
    ('claude','claude-sonnet',200000),
    ('grok','grok-4',256000),
    ('deepseek','deepseek-chat',128000)
) AS v(slug, model_name, context_window)
JOIN public.ai_providers p ON p.slug = v.slug
ON CONFLICT DO NOTHING;
INSERT INTO public.ai_agents
(name, slug, description, role)
VALUES
('Research Agent','research-agent','Finds deep podcast research','researcher'),
('Guest Finder','guest-finder','Discovers expert guests','guest_finder'),
('Outline Agent','outline-agent','Creates episode outlines','outliner'),
('Script Writer','script-writer','Writes podcast scripts','script_writer'),
('SEO Agent','seo-agent','Optimizes SEO','seo_optimizer'),
('Social Agent','social-agent','Creates social content','social_creator'),
('AI Chat','ai-chat','General assistant','assistant'),
('Knowledge Agent','knowledge-agent','Retrieves knowledge','knowledge'),
('Analytics Agent','analytics-agent','Analyzes performance','analyst'),
('Workflow Agent','workflow-agent','Automates podcast workflow','workflow')
ON CONFLICT DO NOTHING;
INSERT INTO public.marketplace_categories
(name,slug)
VALUES
('Templates','templates'),
('AI Agents','ai-agents'),
('Prompt Packs','prompt-packs'),
('Plugins','plugins'),
('Voice Packs','voice-packs'),
('Knowledge Packs','knowledge-packs'),
('Automation','automation'),
('Brand Kits','brand-kits')
ON CONFLICT DO NOTHING;
INSERT INTO public.template_categories
(name,slug)
VALUES
('Podcast','podcast'),
('Interview','interview'),
('Business','business'),
('Technology','technology'),
('Education','education'),
('Marketing','marketing'),
('Comedy','comedy'),
('News','news'),
('Storytelling','storytelling')
ON CONFLICT DO NOTHING;
INSERT INTO public.project_types
(name)
VALUES
('Podcast Episode'),
('Podcast Series'),
('YouTube Video'),
('Newsletter'),
('Blog'),
('Course'),
('Social Campaign')
ON CONFLICT DO NOTHING;
INSERT INTO public.export_formats
(name)
VALUES
('PDF'),
('DOCX'),
('Markdown'),
('TXT'),
('HTML'),
('JSON'),
('CSV'),
('Notion'),
('Google Docs')
ON CONFLICT DO NOTHING;
INSERT INTO public.social_platforms
(name)
VALUES
('YouTube'),
('Spotify'),
('Apple Podcasts'),
('TikTok'),
('Instagram'),
('Facebook'),
('LinkedIn'),
('Threads'),
('X')
ON CONFLICT DO NOTHING;
INSERT INTO public.system_settings
(setting_key, setting_value)
VALUES
('default_ai_provider','"openai"'::jsonb),
('maintenance_mode','false'::jsonb),
('marketplace_enabled','true'::jsonb),
('max_upload_size_mb','500'::jsonb),
('default_language','"en"'::jsonb)
ON CONFLICT DO NOTHING;
INSERT INTO public.feature_flags
(name,enabled)
VALUES
('ai_agents',TRUE),
('marketplace',TRUE),
('vector_search',TRUE),
('api_access',TRUE),
('knowledge_base',TRUE),
('voice_generation',TRUE),
('video_generation',FALSE),
('enterprise_sso',FALSE)
ON CONFLICT DO NOTHING;