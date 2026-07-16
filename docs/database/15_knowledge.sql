/*
=========================================================
 PodMind AI
 Database Migration
 File: 15_knowledge.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- KNOWLEDGE BASES
---------------------------------------------------------

CREATE TABLE public.knowledge_bases (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    name TEXT NOT NULL,

    description TEXT,

    visibility project_visibility DEFAULT 'private',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE DOCUMENTS
---------------------------------------------------------

CREATE TABLE public.knowledge_documents (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    knowledge_base_id UUID NOT NULL
        REFERENCES public.knowledge_bases(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    source_type TEXT,

    source_url TEXT,

    file_url TEXT,

    content TEXT,

    checksum TEXT,

    status record_status DEFAULT 'active',

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE CHUNKS
---------------------------------------------------------

CREATE TABLE public.knowledge_chunks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL
        REFERENCES public.knowledge_documents(id)
        ON DELETE CASCADE,

    chunk_index INTEGER,

    chunk_text TEXT NOT NULL,

    token_count INTEGER,

    embedding VECTOR(1536),

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE ENTITIES
---------------------------------------------------------

CREATE TABLE public.knowledge_entities (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    knowledge_base_id UUID NOT NULL
        REFERENCES public.knowledge_bases(id)
        ON DELETE CASCADE,

    entity_name TEXT NOT NULL,

    entity_type TEXT NOT NULL,

    description TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE RELATIONSHIPS
---------------------------------------------------------

CREATE TABLE public.knowledge_relationships (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    source_entity_id UUID NOT NULL
        REFERENCES public.knowledge_entities(id)
        ON DELETE CASCADE,

    target_entity_id UUID NOT NULL
        REFERENCES public.knowledge_entities(id)
        ON DELETE CASCADE,

    relationship_type TEXT NOT NULL,

    confidence NUMERIC(5,2) DEFAULT 1.00,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE TAGS
---------------------------------------------------------

CREATE TABLE public.knowledge_tags (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL
        REFERENCES public.knowledge_documents(id)
        ON DELETE CASCADE,

    tag TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE SEARCH HISTORY
---------------------------------------------------------

CREATE TABLE public.knowledge_search_history (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    knowledge_base_id UUID
        REFERENCES public.knowledge_bases(id)
        ON DELETE CASCADE,

    query TEXT NOT NULL,

    result_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- KNOWLEDGE CITATIONS
---------------------------------------------------------

CREATE TABLE public.knowledge_citations (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    chunk_id UUID NOT NULL
        REFERENCES public.knowledge_chunks(id)
        ON DELETE CASCADE,

    title TEXT,

    source_url TEXT,

    page_number TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_kb_project
ON public.knowledge_bases(project_id);

CREATE INDEX idx_kb_documents
ON public.knowledge_documents(knowledge_base_id);

CREATE INDEX idx_kb_chunks
ON public.knowledge_chunks(document_id);

CREATE INDEX idx_kb_entities
ON public.knowledge_entities(knowledge_base_id);

CREATE INDEX idx_kb_relationships_source
ON public.knowledge_relationships(source_entity_id);

CREATE INDEX idx_kb_relationships_target
ON public.knowledge_relationships(target_entity_id);

CREATE INDEX idx_kb_embeddings
ON public.knowledge_chunks
USING ivfflat (embedding vector_cosine_ops);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_knowledge_base_updated
BEFORE UPDATE
ON public.knowledge_bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_knowledge_document_updated
BEFORE UPDATE
ON public.knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_citations ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICY
---------------------------------------------------------

CREATE POLICY "Project members manage knowledge bases"

ON public.knowledge_bases

FOR ALL

USING (

    project_id IN (

        SELECT project_id

        FROM public.project_members

        WHERE user_id = auth.uid()

    )

);

COMMIT;

/*
=========================================================

Knowledge Engine Complete

Tables

✓ knowledge_bases
✓ knowledge_documents
✓ knowledge_chunks
✓ knowledge_entities
✓ knowledge_relationships
✓ knowledge_tags
✓ knowledge_search_history
✓ knowledge_citations

Features

✓ RAG Ready
✓ Vector Database
✓ Knowledge Graph
✓ Entity Extraction
✓ Semantic Search
✓ Citations
✓ Document Chunking
✓ Enterprise Ready

Ready For

16_analytics.sql

=========================================================
*/
