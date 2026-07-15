/*
=========================================================
 PodMind AI
 Database Migration
 File: 27_vector.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- VECTOR DOCUMENTS
---------------------------------------------------------

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

---------------------------------------------------------
-- VECTOR CHUNKS
---------------------------------------------------------

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

---------------------------------------------------------
-- EMBEDDING JOBS
---------------------------------------------------------

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

---------------------------------------------------------
-- VECTOR SEARCH LOGS
---------------------------------------------------------

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

---------------------------------------------------------
-- KNOWLEDGE COLLECTIONS
---------------------------------------------------------

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

---------------------------------------------------------
-- COLLECTION DOCUMENTS
---------------------------------------------------------

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

---------------------------------------------------------
-- VECTOR INDEX
---------------------------------------------------------

CREATE INDEX idx_vector_documents_project
ON public.vector_documents(project_id);

CREATE INDEX idx_vector_chunks_document
ON public.vector_chunks(document_id);

CREATE INDEX idx_vector_embedding
ON public.vector_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_vector_documents_updated
BEFORE UPDATE
ON public.vector_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.vector_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embedding_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vector_search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_documents ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- BASIC RLS
---------------------------------------------------------

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

COMMIT;

/*
=========================================================

Vector Engine Complete

Tables

✓ vector_documents
✓ vector_chunks
✓ embedding_jobs
✓ vector_search_logs
✓ knowledge_collections
✓ collection_documents

Features

✓ pgvector Embeddings
✓ Semantic Search
✓ RAG Ready
✓ Knowledge Collections
✓ Chunking
✓ Embedding Queue
✓ Search Logs
✓ Enterprise Ready

Next Suggested Migration

28_workflows.sql

=========================================================
*/
