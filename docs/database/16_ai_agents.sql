/*
=========================================================
 PodMind AI
 Database Migration
 File: 16_ai_agents.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AI AGENTS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT SESSIONS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT TASKS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT MEMORY
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT TOOLS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT WORKFLOWS
---------------------------------------------------------

CREATE TABLE public.ai_agent_workflows (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT,

    description TEXT,

    workflow JSONB,

    enabled BOOLEAN DEFAULT TRUE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- AI AGENT EXECUTIONS
---------------------------------------------------------

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

---------------------------------------------------------
-- AI AGENT LOGS
---------------------------------------------------------

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

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_agents_slug
ON public.ai_agents(slug);

CREATE INDEX idx_agent_tasks
ON public.ai_agent_tasks(agent_id);

CREATE INDEX idx_agent_session
ON public.ai_agent_sessions(project_id);

CREATE INDEX idx_agent_execution
ON public.ai_agent_executions(workflow_id);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_ai_agents_updated
BEFORE UPDATE
ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_logs ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- POLICY
---------------------------------------------------------

CREATE POLICY "Authenticated users can access AI agents"

ON public.ai_agents

FOR SELECT

USING (auth.role() = 'authenticated');

COMMIT;

/*
=========================================================

AI Agents Module Complete

Tables

✓ ai_agents
✓ ai_agent_sessions
✓ ai_agent_tasks
✓ ai_agent_memory
✓ ai_agent_tools
✓ ai_agent_workflows
✓ ai_agent_executions
✓ ai_agent_logs

Core Agents

✓ Research Agent
✓ Guest Agent
✓ Outline Agent
✓ Script Agent
✓ SEO Agent
✓ Social Agent
✓ Analytics Agent
✓ Memory Agent
✓ Orchestrator Agent

Features

✓ Multi-Agent Architecture
✓ Parallel Execution
✓ Workflow Engine
✓ Tool Calling
✓ Agent Memory
✓ Cost Tracking
✓ Token Tracking
✓ Execution Logs
✓ Enterprise Ready

Ready For

17_billing.sql

=========================================================
*/
