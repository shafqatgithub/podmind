/*
=========================================================
 PodMind AI
 Database Migration
 File: 32_seed.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- DEFAULT SUBSCRIPTION PLANS
---------------------------------------------------------

INSERT INTO public.subscription_plans
(name, slug, monthly_price, yearly_price, ai_credits, max_team_members, max_projects)
VALUES
('Free', 'free', 0, 0, 5000, 1, 3),
('Starter', 'starter', 19, 190, 50000, 5, 25),
('Pro', 'pro', 49, 490, 250000, 20, 100),
('Business', 'business', 99, 990, 1000000, 100, 500),
('Enterprise', 'enterprise', 0, 0, 999999999, 999999, 999999)
ON CONFLICT DO NOTHING;

---------------------------------------------------------
-- AI PROVIDERS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI MODELS
---------------------------------------------------------

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

---------------------------------------------------------
-- DEFAULT AI AGENTS
---------------------------------------------------------

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

---------------------------------------------------------
-- MARKETPLACE CATEGORIES
---------------------------------------------------------

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

---------------------------------------------------------
-- TEMPLATE CATEGORIES
---------------------------------------------------------

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

---------------------------------------------------------
-- PROJECT TYPES
---------------------------------------------------------

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

---------------------------------------------------------
-- EXPORT FORMATS
---------------------------------------------------------

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

---------------------------------------------------------
-- SOCIAL PLATFORMS
---------------------------------------------------------

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

---------------------------------------------------------
-- SYSTEM SETTINGS
---------------------------------------------------------

INSERT INTO public.system_settings
(setting_key, setting_value)
VALUES
('default_ai_provider','"openai"'::jsonb),
('maintenance_mode','false'::jsonb),
('marketplace_enabled','true'::jsonb),
('max_upload_size_mb','500'::jsonb),
('default_language','"en"'::jsonb)
ON CONFLICT DO NOTHING;

---------------------------------------------------------
-- FEATURE FLAGS
---------------------------------------------------------

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

COMMIT;

/*
=========================================================

Seed Data Complete

Included

✓ Subscription Plans
✓ AI Providers
✓ AI Models
✓ AI Agents
✓ Marketplace Categories
✓ Template Categories
✓ Project Types
✓ Export Formats
✓ Social Platforms
✓ Feature Flags
✓ System Settings

Production Ready

Next

33_storage.sql

=========================================================
*/
