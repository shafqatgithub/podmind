/*
=========================================================
 PodMind AI
 Database Migration
 File: 13_ai_chat.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AI CONVERSATIONS
---------------------------------------------------------

CREATE TABLE public.ai_conversations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    ai_provider ai_provider DEFAULT 'openai',

    model_name TEXT,

    system_prompt TEXT,

    temperature NUMERIC(3,2) DEFAULT 0.7,

    max_tokens INTEGER DEFAULT 4096,

    total_messages INTEGER DEFAULT 0,

    total_tokens INTEGER DEFAULT 0,

    total_cost NUMERIC(12,6) DEFAULT 0,

    is_pinned BOOLEAN DEFAULT FALSE,

    is_archived BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI MESSAGES
---------------------------------------------------------

CREATE TABLE public.ai_messages (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,

    role TEXT NOT NULL,

    content TEXT NOT NULL,

    ai_provider ai_provider,

    model_name TEXT,

    prompt_tokens INTEGER DEFAULT 0,

    completion_tokens INTEGER DEFAULT 0,

    total_tokens INTEGER DEFAULT 0,

    estimated_cost NUMERIC(12,6) DEFAULT 0,

    response_time_ms INTEGER,

    parent_message_id UUID
        REFERENCES public.ai_messages(id)
        ON DELETE SET NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI ATTACHMENTS
---------------------------------------------------------

CREATE TABLE public.ai_attachments (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.ai_messages(id)
        ON DELETE CASCADE,

    file_name TEXT,

    file_url TEXT,

    file_type file_type,

    file_size BIGINT,

    extracted_text TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI PROMPTS
---------------------------------------------------------

CREATE TABLE public.ai_prompts (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    title TEXT,

    category ai_task,

    prompt TEXT NOT NULL,

    is_system BOOLEAN DEFAULT FALSE,

    is_public BOOLEAN DEFAULT FALSE,

    usage_count INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI CONVERSATION CONTEXT
---------------------------------------------------------

CREATE TABLE public.ai_context (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    conversation_id UUID NOT NULL
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    research_session_id UUID
        REFERENCES public.research_sessions(id)
        ON DELETE SET NULL,

    guest_id UUID
        REFERENCES public.guests(id)
        ON DELETE SET NULL,

    outline_id UUID
        REFERENCES public.outlines(id)
        ON DELETE SET NULL,

    script_id UUID
        REFERENCES public.scripts(id)
        ON DELETE SET NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI TOOL CALLS
---------------------------------------------------------

CREATE TABLE public.ai_tool_calls (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.ai_messages(id)
        ON DELETE CASCADE,

    tool_name TEXT,

    tool_input JSONB,

    tool_output JSONB,

    execution_time_ms INTEGER,

    success BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI FEEDBACK
---------------------------------------------------------

CREATE TABLE public.ai_feedback (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.ai_messages(id)
        ON DELETE CASCADE,

    user_id UUID
        REFERENCES public.profiles(id),

    rating INTEGER,

    feedback TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI CHAT BOOKMARKS
---------------------------------------------------------

CREATE TABLE public.ai_chat_bookmarks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.ai_messages(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(message_id,user_id)

);

---------------------------------------------------------
-- AI MESSAGE EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.ai_message_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES public.ai_messages(id)
        ON DELETE CASCADE,

    chunk_text TEXT,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_ai_conversation_project
ON public.ai_conversations(project_id);

CREATE INDEX idx_ai_conversation_user
ON public.ai_conversations(user_id);

CREATE INDEX idx_ai_messages_conversation
ON public.ai_messages(conversation_id);

CREATE INDEX idx_ai_prompts_category
ON public.ai_prompts(category);

CREATE INDEX idx_ai_feedback_message
ON public.ai_feedback(message_id);

CREATE INDEX idx_ai_embeddings
ON public.ai_message_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_ai_conversations_updated

BEFORE UPDATE

ON public.ai_conversations

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_ai_prompts_updated

BEFORE UPDATE

ON public.ai_prompts

FOR EACH ROW

EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_embeddings ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS
---------------------------------------------------------

CREATE POLICY "Users manage own AI conversations"

ON public.ai_conversations

FOR ALL

USING (

    auth.uid() = user_id

);

COMMIT;

/*
=========================================================

AI Chat Module Complete

Tables

✓ ai_conversations
✓ ai_messages
✓ ai_attachments
✓ ai_prompts
✓ ai_context
✓ ai_tool_calls
✓ ai_feedback
✓ ai_chat_bookmarks
✓ ai_message_embeddings

Features

✓ Multi AI Providers
✓ GPT / Claude / Gemini Support
✓ Context Aware Chat
✓ Tool Calling
✓ File Attachments
✓ Prompt Library
✓ Token Tracking
✓ Cost Tracking
✓ Conversation Memory
✓ Semantic Search

Ready For

14_ai_memory.sql

=========================================================
*/
