CREATE TABLE IF NOT EXISTS public.topic_discoveries (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    niche           text NOT NULL,
    audience        text,
    country         text,
    ai_provider     public.ai_provider,
    model_name      text,
    metadata        jsonb DEFAULT '{}'::jsonb,
    status          public.record_status NOT NULL DEFAULT 'active',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.discovered_topics (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    discovery_id    uuid NOT NULL REFERENCES public.topic_discoveries(id) ON DELETE CASCADE,
    title           text NOT NULL,
    angle           text,
    why_now         text,
    audience_fit    text,
    momentum        text,
    search_terms    text[] DEFAULT '{}',
    sources         jsonb DEFAULT '[]'::jsonb,
    sort_order      integer NOT NULL DEFAULT 0,
    is_saved        boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guest_suggestions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    topic           text NOT NULL,
    country         text,
    full_name       text NOT NULL,
    headline        text,
    why_them        text,
    expertise       text,
    reachability    text,
    profile_urls    jsonb DEFAULT '[]'::jsonb,
    sources         jsonb DEFAULT '[]'::jsonb,
    confidence      numeric(3,2),
    sort_order      integer NOT NULL DEFAULT 0,
    guest_id        uuid REFERENCES public.guests(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.content_calendar (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    created_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    title             text NOT NULL,
    topic             text,
    notes             text,
    scheduled_for     date NOT NULL,
    publish_at        date,
    guest_id          uuid REFERENCES public.guests(id) ON DELETE SET NULL,
    agent_session_id  uuid REFERENCES public.ai_agent_sessions(id) ON DELETE SET NULL,
    status            text NOT NULL DEFAULT 'planned',
    sort_order        integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_topic_discoveries_project ON public.topic_discoveries(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_topics_discovery ON public.discovered_topics(discovery_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_guest_suggestions_project ON public.guest_suggestions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_calendar_project_date ON public.content_calendar(project_id, scheduled_for);
CREATE TRIGGER trg_topic_discoveries_updated BEFORE UPDATE ON public.topic_discoveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_content_calendar_updated BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
ALTER TABLE public.topic_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovered_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
