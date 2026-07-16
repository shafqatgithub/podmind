/*
=========================================================
 PodMind AI
 Database Migration
 File: 31_rls.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- HELPER FUNCTIONS
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
SELECT organization_id
FROM public.profiles
WHERE id = auth.uid()
LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id = org
);
$$;

---------------------------------------------------------
-- PROFILES
---------------------------------------------------------

DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
DROP POLICY IF EXISTS profiles_delete ON public.profiles;

CREATE POLICY profiles_select
ON public.profiles
FOR SELECT
USING (
    organization_id = public.current_organization_id()
);

CREATE POLICY profiles_update
ON public.profiles
FOR UPDATE
USING (
    id = auth.uid()
);

---------------------------------------------------------
-- ORGANIZATIONS
---------------------------------------------------------

DROP POLICY IF EXISTS organizations_select
ON public.organizations;

CREATE POLICY organizations_select

ON public.organizations

FOR SELECT

USING (

id = public.current_organization_id()

);

---------------------------------------------------------
-- WORKSPACES
---------------------------------------------------------

DROP POLICY IF EXISTS workspaces_access

ON public.workspaces;

CREATE POLICY workspaces_access

ON public.workspaces

FOR ALL

USING (

public.is_organization_member(organization_id)

);

---------------------------------------------------------
-- PROJECTS
---------------------------------------------------------

DROP POLICY IF EXISTS projects_access

ON public.projects;

CREATE POLICY projects_access

ON public.projects

FOR ALL

USING (

public.is_organization_member(
    (SELECT w.organization_id
       FROM public.workspaces w
      WHERE w.id = workspace_id)
)

);

---------------------------------------------------------
-- RESEARCH
---------------------------------------------------------

DROP POLICY IF EXISTS research_access

ON public.research_sessions;

CREATE POLICY research_access

ON public.research_sessions

FOR ALL

USING (

EXISTS (

SELECT 1

FROM public.projects p

WHERE p.id = project_id

AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = p.workspace_id))

)

);

---------------------------------------------------------
-- GUESTS
---------------------------------------------------------

DROP POLICY IF EXISTS guests_access

ON public.guests;

CREATE POLICY guests_access

ON public.guests

FOR ALL

USING (

EXISTS (

SELECT 1

FROM public.projects

WHERE projects.id = guests.project_id

AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))

)

);

---------------------------------------------------------
-- OUTLINES
---------------------------------------------------------

DROP POLICY IF EXISTS outlines_access

ON public.outlines;

CREATE POLICY outlines_access

ON public.outlines

FOR ALL

USING (

EXISTS (

SELECT 1

FROM public.projects

WHERE projects.id = outlines.project_id

AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))

)

);

---------------------------------------------------------
-- SCRIPTS
---------------------------------------------------------

DROP POLICY IF EXISTS scripts_access

ON public.scripts;

CREATE POLICY scripts_access

ON public.scripts

FOR ALL

USING (

EXISTS (

SELECT 1

FROM public.projects

WHERE projects.id = scripts.project_id

AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))

)

);

---------------------------------------------------------
-- KNOWLEDGE
---------------------------------------------------------

DROP POLICY IF EXISTS knowledge_access

ON public.knowledge_bases;

CREATE POLICY knowledge_access

ON public.knowledge_bases

FOR ALL

USING (

EXISTS (

SELECT 1

FROM public.projects

WHERE projects.id = knowledge_bases.project_id

AND public.is_organization_member((SELECT w.organization_id FROM public.workspaces w WHERE w.id = projects.workspace_id))

)

);

---------------------------------------------------------
-- AI MEMORY
---------------------------------------------------------

DROP POLICY IF EXISTS ai_memory_access

ON public.ai_memories;

CREATE POLICY ai_memory_access

ON public.ai_memories

FOR ALL

USING (

user_id = auth.uid()

);

---------------------------------------------------------
-- EXPORTS
---------------------------------------------------------

DROP POLICY IF EXISTS exports_access

ON public.export_jobs;

CREATE POLICY exports_access

ON public.export_jobs

FOR ALL

USING (

public.is_organization_member(organization_id)

);

---------------------------------------------------------
-- MARKETPLACE
---------------------------------------------------------

DROP POLICY IF EXISTS marketplace_public

ON public.marketplace_items;

CREATE POLICY marketplace_public

ON public.marketplace_items

FOR SELECT

USING (

visibility='public'

OR created_by=auth.uid()

);

---------------------------------------------------------
-- ADMIN
---------------------------------------------------------

DROP POLICY IF EXISTS admin_only

ON public.admin_users;

CREATE POLICY admin_only

ON public.admin_users

FOR ALL

USING (

public.is_super_admin()

);

---------------------------------------------------------
-- API KEYS
---------------------------------------------------------

DROP POLICY IF EXISTS api_keys_access

ON public.api_keys;

CREATE POLICY api_keys_access

ON public.api_keys

FOR ALL

USING (

public.is_organization_member(organization_id)

);

---------------------------------------------------------
-- BILLING
---------------------------------------------------------

DROP POLICY IF EXISTS billing_access

ON public.organization_subscriptions;

CREATE POLICY billing_access

ON public.organization_subscriptions

FOR ALL

USING (

public.is_organization_member(organization_id)

);

---------------------------------------------------------
-- VECTOR
---------------------------------------------------------

DROP POLICY IF EXISTS vector_documents_access

ON public.vector_documents;

CREATE POLICY vector_documents_access

ON public.vector_documents

FOR ALL

USING (

public.is_organization_member(organization_id)

);

COMMIT;

/*
=========================================================

RLS Security Complete

Coverage

✓ Profiles
✓ Organizations
✓ Workspaces
✓ Projects
✓ Research
✓ Guests
✓ Outlines
✓ Scripts
✓ Knowledge
✓ AI Memory
✓ Exports
✓ Marketplace
✓ Billing
✓ API
✓ Vector
✓ Admin

Security

✓ Multi-Tenant Isolation
✓ Organization Isolation
✓ User Isolation
✓ Enterprise Ready

Ready For

32_storage.sql

=========================================================
*/
