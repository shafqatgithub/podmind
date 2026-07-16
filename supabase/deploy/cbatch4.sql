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
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_message_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI conversations"
ON public.ai_conversations
FOR ALL
USING (
    auth.uid() = user_id
);
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
CREATE TABLE public.memory_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
CREATE TABLE public.memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL
        REFERENCES public.ai_memories(id)
        ON DELETE CASCADE,
    ai_provider ai_provider,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE public.ai_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own memories"
ON public.ai_memories
FOR ALL
USING (
    auth.uid() = user_id
);
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
CREATE TABLE public.knowledge_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES public.knowledge_documents(id)
        ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_citations ENABLE ROW LEVEL SECURITY;
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
CREATE TABLE public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug CITEXT UNIQUE NOT NULL,
    description TEXT,
    role TEXT NOT NULL,
    ai_provider ai_provider DEFAULT 'openai',
    default_model TEXT,
    temperature NUMERIC(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 8192,
    is_system BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    icon TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    conversation_id UUID
        REFERENCES public.ai_conversations(id)
        ON DELETE CASCADE,
    started_by UUID
        REFERENCES public.profiles(id),
    session_name TEXT,
    status TEXT DEFAULT 'running',
    metadata JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE TABLE public.ai_agent_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL
        REFERENCES public.ai_agent_sessions(id)
        ON DELETE CASCADE,
    agent_id UUID NOT NULL
        REFERENCES public.ai_agents(id)
        ON DELETE CASCADE,
    task_name TEXT,
    task_type ai_task,
    priority INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    input JSONB,
    output JSONB,
    execution_time_ms INTEGER,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    estimated_cost NUMERIC(12,6) DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE TABLE public.ai_agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL
        REFERENCES public.ai_agents(id)
        ON DELETE CASCADE,
    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,
    memory TEXT,
    importance INTEGER DEFAULT 5,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL
        REFERENCES public.ai_agents(id)
        ON DELETE CASCADE,
    tool_name TEXT,
    description TEXT,
    endpoint TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_agent_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    description TEXT,
    workflow JSONB,
    enabled BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.ai_agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID
        REFERENCES public.ai_agent_workflows(id)
        ON DELETE CASCADE,
    session_id UUID
        REFERENCES public.ai_agent_sessions(id)
        ON DELETE CASCADE,
    status TEXT,
    total_agents INTEGER,
    total_time_ms INTEGER,
    total_cost NUMERIC(12,6),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE TABLE public.ai_agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID
        REFERENCES public.ai_agent_executions(id)
        ON DELETE CASCADE,
    task_id UUID
        REFERENCES public.ai_agent_tasks(id)
        ON DELETE CASCADE,
    level TEXT,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agents_slug
ON public.ai_agents(slug);
CREATE INDEX idx_agent_tasks
ON public.ai_agent_tasks(agent_id);
CREATE INDEX idx_agent_session
ON public.ai_agent_sessions(project_id);
CREATE INDEX idx_agent_execution
ON public.ai_agent_executions(workflow_id);
CREATE TRIGGER trg_ai_agents_updated
BEFORE UPDATE
ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access AI agents"
ON public.ai_agents
FOR SELECT
USING (auth.role() = 'authenticated');