-- ============================================================
-- 37_ai_requests_organization.sql
-- Give AI telemetry a first-class organization column.
--
-- ai_requests records every provider attempt, and the Analytics module is
-- specified in terms of per-organization usage: credits, tokens, provider
-- mix, cost. But the table only carried the organization inside `metadata`,
-- so every analytics query would have had to filter on
-- metadata->>'organization_id' — untyped, unindexable in practice, and
-- silently wrong if a writer ever forgot the key.
--
-- The column is nullable because historical rows predate it; the backfill
-- below recovers them from the metadata they were written with.
-- ============================================================

ALTER TABLE public.ai_requests
  ADD COLUMN IF NOT EXISTS organization_id uuid
  REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.ai_requests r
   SET organization_id = (r.metadata->>'organization_id')::uuid
 WHERE r.organization_id IS NULL
   AND r.metadata ? 'organization_id'
   AND (r.metadata->>'organization_id') ~
       '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   AND EXISTS (
     SELECT 1 FROM public.organizations o
      WHERE o.id = (r.metadata->>'organization_id')::uuid
   );

-- Analytics always reads "this organization, this time window".
CREATE INDEX IF NOT EXISTS ai_requests_org_created_idx
  ON public.ai_requests (organization_id, created_at DESC);

-- Provider and task breakdowns group within that same window.
CREATE INDEX IF NOT EXISTS ai_requests_org_provider_idx
  ON public.ai_requests (organization_id, provider_id);
