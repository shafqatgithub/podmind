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
CREATE INDEX IF NOT EXISTS ai_requests_org_created_idx
  ON public.ai_requests (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_requests_org_provider_idx
  ON public.ai_requests (organization_id, provider_id);
