/*
=========================================================
 PodMind AI
 Database Migration
 File: 14_ai_memory.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AI MEMORIES
---------------------------------------------------------

CREATE TABLE public.ai_memories (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    conversation_id UUID
        REFERENCES public.ai_conversations(id)
        ON DELETE SET NULL,

    memory_type memory_type NOT NULL,

    title TEXT,

    content TEXT NOT NULL,

    importance INTEGER DEFAULT 5,

    confidence NUMERIC(5,2) DEFAULT 1.00,

    source TEXT,

    expires_at TIMESTAMPTZ,

    last_accessed_at TIMESTAMPTZ,

    access_count INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY COLLECTIONS
---------------------------------------------------------

CREATE TABLE public.memory_collections (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    description TEXT,

    color TEXT DEFAULT '#6366F1',

    icon TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY LINKS
---------------------------------------------------------

CREATE TABLE public.memory_links (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    collection_id UUID NOT NULL
        REFERENCES public.memory_collections(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(memory_id, collection_id)

);

---------------------------------------------------------
-- MEMORY TAGS
---------------------------------------------------------

CREATE TABLE public.memory_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY RELATIONSHIPS
---------------------------------------------------------

CREATE TABLE public.memory_relationships (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    target_memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    relationship TEXT,

    strength NUMERIC(5,2) DEFAULT 1.00,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY EMBEDDINGS
---------------------------------------------------------

CREATE TABLE public.memory_embeddings (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    chunk_text TEXT,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY ACCESS LOG
---------------------------------------------------------

CREATE TABLE public.memory_access_logs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    conversation_id UUID
        REFERENCES public.ai_conversations(id)
        ON DELETE SET NULL,

    accessed_by UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- MEMORY SUMMARIES
---------------------------------------------------------

CREATE TABLE public.memory_summaries (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,

    ai_provider ai_provider,

    summary TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_memory_user
ON public.ai_memories(user_id);

CREATE INDEX idx_memory_project
ON public.ai_memories(project_id);

CREATE INDEX idx_memory_type
ON public.ai_memories(memory_type);

CREATE INDEX idx_memory_importance
ON public.ai_memories(importance);

CREATE INDEX idx_memory_embedding
ON public.memory_embeddings
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_ai_memories_updated
BEFORE UPDATE
ON public.ai_memories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_memory_collections_updated
BEFORE UPDATE
ON public.memory_collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_summaries ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Users manage own memories"

ON public.ai_memories

FOR ALL

USING (

    auth.uid() = user_id

);

COMMIT;

/*
=========================================================

AI Memory Module Complete

Tables

✓ ai_memories
✓ memory_collections
✓ memory_links
✓ memory_tags
✓ memory_relationships
✓ memory_embeddings
✓ memory_access_logs
✓ memory_summaries

Features

✓ Long-Term Memory
✓ Semantic Search
✓ Memory Collections
✓ Knowledge Graph
✓ Vector Search
✓ Memory Ranking
✓ Memory Recall
✓ AI Summaries
✓ Enterprise Ready

Ready For

15_ai_agents.sql

=========================================================
*/
