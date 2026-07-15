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
(name, slug, price_monthly, price_yearly, ai_credits, max_users, max_projects)
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
(name, provider_key, is_active)
VALUES
('OpenAI','openai',TRUE),
('Google Gemini','gemini',TRUE),
('Anthropic Claude','claude',TRUE),
('Mistral AI','mistral',TRUE),
('xAI Grok','grok',TRUE),
('DeepSeek','deepseek',TRUE),
('OpenRouter','openrouter',TRUE),
('Azure OpenAI','azure-openai',FALSE),
('AWS Bedrock','bedrock',FALSE)
ON CONFLICT DO NOTHING;

---------------------------------------------------------
-- AI MODELS
---------------------------------------------------------

INSERT INTO public.ai_models
(provider_key, model_name, model_type, context_window)
VALUES
('openai','gpt-5','chat',400000),
('openai','gpt-5-mini','chat',400000),
('gemini','gemini-2.5-pro','chat',1000000),
('gemini','gemini-2.5-flash','chat',1000000),
('claude','claude-opus','chat',200000),
('claude','claude-sonnet','chat',200000),
('grok','grok-4','chat',256000),
('deepseek','deepseek-chat','chat',128000)
ON CONFLICT DO NOTHING;

---------------------------------------------------------
-- DEFAULT AI AGENTS
---------------------------------------------------------

INSERT INTO public.ai_agents
(name, slug, description)
VALUES
('Research Agent','research-agent','Finds deep podcast research'),
('Guest Finder','guest-finder','Discovers expert guests'),
('Outline Agent','outline-agent','Creates episode outlines'),
('Script Writer','script-writer','Writes podcast scripts'),
('SEO Agent','seo-agent','Optimizes SEO'),
('Social Agent','social-agent','Creates social content'),
('AI Chat','ai-chat','General assistant'),
('Knowledge Agent','knowledge-agent','Retrieves knowledge'),
('Analytics Agent','analytics-agent','Analyzes performance'),
('Workflow Agent','workflow-agent','Automates podcast workflow')
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
('Podcast'),
('Interview'),
('Business'),
('Technology'),
('Education'),
('Marketing'),
('Comedy'),
('News'),
('Storytelling')
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
