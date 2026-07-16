/*
=========================================================
 PodMind AI
 Database Migration
 File: 18_exports.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- EXPORT JOBS
---------------------------------------------------------

CREATE TABLE public.export_jobs (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    organization_id UUID
        REFERENCES public.organizations(id)
        ON DELETE CASCADE,

    project_id UUID
        REFERENCES public.projects(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    export_type export_format NOT NULL,

    resource_type TEXT NOT NULL,

    resource_id UUID NOT NULL,

    status TEXT DEFAULT 'pending',

    progress INTEGER DEFAULT 0,

    file_name TEXT,

    file_url TEXT,

    file_size BIGINT,

    mime_type TEXT,

    started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    error_message TEXT,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- EXPORT TEMPLATES
---------------------------------------------------------

CREATE TABLE public.export_templates (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    created_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    name TEXT NOT NULL,

    description TEXT,

    export_type export_format,

    template_config JSONB DEFAULT '{}'::jsonb,

    is_system BOOLEAN DEFAULT FALSE,

    is_public BOOLEAN DEFAULT FALSE,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- EXPORT HISTORY
---------------------------------------------------------

CREATE TABLE public.export_history (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,

    downloaded_by UUID
        REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    download_count INTEGER DEFAULT 1,

    downloaded_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- EXPORT SHARES
---------------------------------------------------------

CREATE TABLE public.export_shares (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,

    share_token UUID DEFAULT gen_random_uuid(),

    password_hash TEXT,

    expires_at TIMESTAMPTZ,

    max_downloads INTEGER,

    current_downloads INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- EXPORT QUEUE
---------------------------------------------------------

CREATE TABLE public.export_queue (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,

    priority INTEGER DEFAULT 1,

    worker_name TEXT,

    attempts INTEGER DEFAULT 0,

    status TEXT DEFAULT 'queued',

    scheduled_at TIMESTAMPTZ DEFAULT NOW(),

    processed_at TIMESTAMPTZ

);

---------------------------------------------------------
-- EXPORT ANALYTICS
---------------------------------------------------------

CREATE TABLE public.export_analytics (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    export_job_id UUID NOT NULL
        REFERENCES public.export_jobs(id)
        ON DELETE CASCADE,

    processing_time_ms INTEGER,

    compression_ratio NUMERIC(6,2),

    generated_pages INTEGER,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW()

);

---------------------------------------------------------
-- INDEXES
---------------------------------------------------------

CREATE INDEX idx_export_project
ON public.export_jobs(project_id);

CREATE INDEX idx_export_user
ON public.export_jobs(user_id);

CREATE INDEX idx_export_status
ON public.export_jobs(status);

CREATE INDEX idx_export_queue
ON public.export_queue(status);

---------------------------------------------------------
-- UPDATED_AT
---------------------------------------------------------

CREATE TRIGGER trg_export_jobs_updated
BEFORE UPDATE
ON public.export_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_export_templates_updated
BEFORE UPDATE
ON public.export_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

---------------------------------------------------------
-- ENABLE RLS
---------------------------------------------------------

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_analytics ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

CREATE POLICY "Users manage own exports"

ON public.export_jobs

FOR ALL

USING (

    auth.uid() = user_id

);

CREATE POLICY "Users can view public templates"

ON public.export_templates

FOR SELECT

USING (

    is_public = TRUE
    OR is_system = TRUE

);

COMMIT;

/*
=========================================================

Export Engine Complete

Tables

✓ export_jobs
✓ export_templates
✓ export_history
✓ export_shares
✓ export_queue
✓ export_analytics

Supported Formats

✓ PDF
✓ DOCX
✓ Markdown
✓ HTML
✓ TXT
✓ JSON
✓ CSV

Features

✓ Async Export Queue
✓ Background Workers
✓ Share Links
✓ Password Protected Downloads
✓ Export Analytics
✓ Download History
✓ Enterprise Ready

Ready For

19_notifications.sql

=========================================================
*/

---------------------------------------------------------
-- EXPORT FORMATS (lookup — seeded in 32_seed.sql)
---------------------------------------------------------

CREATE TABLE public.export_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
