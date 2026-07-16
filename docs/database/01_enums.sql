/*
=========================================================
 PodMind AI
 Database Migration
 File: 01_enums.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- USER ROLES
---------------------------------------------------------

CREATE TYPE user_role AS ENUM (
    'user',
    'pro',
    'business',
    'enterprise',
    'admin',
    'super_admin'
);

---------------------------------------------------------
-- ORGANIZATION ROLE
---------------------------------------------------------

CREATE TYPE organization_role AS ENUM (
    'owner',
    'admin',
    'manager',
    'member',
    'viewer'
);

---------------------------------------------------------
-- WORKSPACE ROLE
---------------------------------------------------------

CREATE TYPE workspace_role AS ENUM (
    'owner',
    'admin',
    'editor',
    'contributor',
    'viewer'
);

---------------------------------------------------------
-- PROJECT STATUS
---------------------------------------------------------

CREATE TYPE project_status AS ENUM (
    'draft',
    'research',
    'outline',
    'writing',
    'review',
    'published',
    'archived'
);

---------------------------------------------------------
-- PROJECT VISIBILITY
---------------------------------------------------------

CREATE TYPE project_visibility AS ENUM (
    'private',
    'workspace',
    'organization',
    'public'
);

---------------------------------------------------------
-- RESEARCH DEPTH
---------------------------------------------------------

CREATE TYPE research_depth AS ENUM (
    'quick',
    'standard',
    'deep'
);

---------------------------------------------------------
-- AI PROVIDERS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI MODEL CATEGORY
---------------------------------------------------------

CREATE TYPE ai_model_category AS ENUM (
    'chat',
    'reasoning',
    'vision',
    'embedding',
    'speech',
    'image'
);

---------------------------------------------------------
-- AI TASK TYPE
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT
---------------------------------------------------------

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

---------------------------------------------------------
-- SCRIPT STYLE
---------------------------------------------------------

CREATE TYPE script_style AS ENUM (
    'solo',
    'interview',
    'educational',
    'storytelling',
    'business',
    'news',
    'casual'
);

---------------------------------------------------------
-- CONTENT TONE
---------------------------------------------------------

CREATE TYPE content_tone AS ENUM (
    'professional',
    'friendly',
    'formal',
    'casual',
    'humorous',
    'motivational',
    'technical'
);

---------------------------------------------------------
-- EXPORT FORMAT
---------------------------------------------------------

CREATE TYPE export_format AS ENUM (
    'pdf',
    'docx',
    'markdown',
    'html',
    'txt',
    'json'
);

---------------------------------------------------------
-- SOCIAL PLATFORM
---------------------------------------------------------

CREATE TYPE social_platform AS ENUM (
    'linkedin',
    'x',
    'facebook',
    'instagram',
    'threads',
    'youtube',
    'newsletter'
);

---------------------------------------------------------
-- SUBSCRIPTION PLAN
---------------------------------------------------------

CREATE TYPE subscription_plan AS ENUM (
    'free',
    'starter',
    'pro',
    'business',
    'enterprise'
);

---------------------------------------------------------
-- PAYMENT STATUS
---------------------------------------------------------

CREATE TYPE payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'cancelled',
    'refunded'
);

---------------------------------------------------------
-- BILLING INTERVAL
---------------------------------------------------------

CREATE TYPE billing_interval AS ENUM (
    'monthly',
    'yearly'
);

---------------------------------------------------------
-- NOTIFICATION TYPE
---------------------------------------------------------

CREATE TYPE notification_type AS ENUM (
    'system',
    'project',
    'research',
    'billing',
    'security',
    'announcement',
    'marketing'
);

---------------------------------------------------------
-- NOTIFICATION STATUS
---------------------------------------------------------

CREATE TYPE notification_status AS ENUM (
    'unread',
    'read',
    'archived'
);

---------------------------------------------------------
-- FILE TYPE
---------------------------------------------------------

CREATE TYPE file_type AS ENUM (
    'document',
    'image',
    'audio',
    'video',
    'export',
    'attachment'
);

---------------------------------------------------------
-- LANGUAGE
---------------------------------------------------------

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

---------------------------------------------------------
-- RECORD STATUS
---------------------------------------------------------

CREATE TYPE record_status AS ENUM (
    'active',
    'inactive',
    'deleted'
);

---------------------------------------------------------
-- AUDIT ACTION
---------------------------------------------------------

CREATE TYPE audit_action AS ENUM (
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'export',
    'share'
);

---------------------------------------------------------
-- COMMENTS
---------------------------------------------------------

COMMENT ON TYPE user_role IS 'Application user roles';
COMMENT ON TYPE organization_role IS 'Organization permissions';
COMMENT ON TYPE workspace_role IS 'Workspace permissions';
COMMENT ON TYPE project_status IS 'Podcast project lifecycle';
COMMENT ON TYPE ai_provider IS 'Supported AI providers';
COMMENT ON TYPE ai_agent IS 'PodMind AI agents';
COMMENT ON TYPE subscription_plan IS 'Subscription plans';
COMMENT ON TYPE export_format IS 'Supported export formats';

COMMIT;

---------------------------------------------------------
-- MEMORY TYPE (used by 14_ai_memory.sql)
---------------------------------------------------------

CREATE TYPE memory_type AS ENUM (
    'fact',
    'preference',
    'context',
    'instruction',
    'summary',
    'insight'
);
