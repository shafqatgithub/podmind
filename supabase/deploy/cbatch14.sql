DO $$ BEGIN
  CREATE TYPE public.claim_verdict AS ENUM (
    'verified', 'partially_verified', 'unverified', 'disputed', 'false'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.claim_type AS ENUM (
    'statistic', 'quote', 'date', 'name', 'company', 'event', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.fact_checks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  script_id           uuid REFERENCES public.scripts(id) ON DELETE SET NULL,
  research_session_id uuid REFERENCES public.research_sessions(id) ON DELETE SET NULL,
  created_by          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title               text NOT NULL,
  source_text         text,
  ai_provider         public.ai_provider,
  model_name          text,
  total_claims        integer NOT NULL DEFAULT 0,
  verified_claims     integer NOT NULL DEFAULT 0,
  flagged_claims      integer NOT NULL DEFAULT 0,
  status              public.record_status NOT NULL DEFAULT 'active',
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fact_check_claims (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_check_id  uuid NOT NULL REFERENCES public.fact_checks(id) ON DELETE CASCADE,
  claim          text NOT NULL,
  claim_type     public.claim_type NOT NULL DEFAULT 'other',
  verdict        public.claim_verdict NOT NULL DEFAULT 'unverified',
  confidence     numeric(4,3),
  explanation    text,
  correction     text,
  evidence       jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fact_checks_project_created_idx
  ON public.fact_checks (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fact_check_claims_check_idx
  ON public.fact_check_claims (fact_check_id, sort_order);
DROP TRIGGER IF EXISTS fact_checks_updated_at ON public.fact_checks;
CREATE TRIGGER fact_checks_updated_at
  BEFORE UPDATE ON public.fact_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS fact_checks_audit ON public.fact_checks;
CREATE TRIGGER fact_checks_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.fact_checks
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
ALTER TABLE public.fact_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_check_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fact_checks_member_access ON public.fact_checks;
CREATE POLICY fact_checks_member_access ON public.fact_checks
  FOR ALL TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
       JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE w.organization_id = public.current_organization_id()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM public.projects p
       JOIN public.workspaces w ON w.id = p.workspace_id
      WHERE w.organization_id = public.current_organization_id()
    )
  );
DROP POLICY IF EXISTS fact_check_claims_member_access ON public.fact_check_claims;
CREATE POLICY fact_check_claims_member_access ON public.fact_check_claims
  FOR ALL TO authenticated
  USING (
    fact_check_id IN (SELECT id FROM public.fact_checks)
  )
  WITH CHECK (
    fact_check_id IN (SELECT id FROM public.fact_checks)
  );
