/*
=========================================================
 PodMind AI
 Database Migration
 File: 34_generic_trigger_fixes.sql
 Version: 1.0
 Purpose: Make the shared trigger functions work on every
          table they are attached to.

 Defects found while implementing the Projects module:

 1) audit_trigger() read NEW.organization_id, but tables are
    scoped differently — projects/research/scripts hang off a
    workspace, not an organization. Any INSERT on those tables
    failed with: record "new" has no field "organization_id".

 2) auto_slug() read NEW.name, but several tables use `title`
    (projects, outlines, scripts...), so slug generation failed
    the same way.

 Both are now schema-agnostic: they inspect the row as JSONB and
 resolve the organization through the workspace when needed.
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- AUDIT TRIGGER (schema agnostic)
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_row jsonb := to_jsonb(COALESCE(NEW, OLD));
    v_org uuid;
BEGIN
    -- Resolve the owning organization from whichever key the row carries.
    IF v_row ? 'organization_id' THEN
        v_org := NULLIF(v_row ->> 'organization_id', '')::uuid;

    ELSIF v_row ? 'workspace_id' THEN
        SELECT w.organization_id
          INTO v_org
          FROM public.workspaces w
         WHERE w.id = NULLIF(v_row ->> 'workspace_id', '')::uuid;

    ELSIF v_row ? 'project_id' THEN
        SELECT w.organization_id
          INTO v_org
          FROM public.projects p
          JOIN public.workspaces w ON w.id = p.workspace_id
         WHERE p.id = NULLIF(v_row ->> 'project_id', '')::uuid;
    END IF;

    INSERT INTO public.audit_events(
        organization_id, actor_id, action, resource_type, resource_id, changes
    )
    VALUES (
        v_org,
        auth.uid(),                       -- NULL for service-role/API writes
        TG_OP,
        TG_TABLE_NAME,
        NULLIF(v_row ->> 'id', '')::uuid,
        v_row
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

---------------------------------------------------------
-- AUTO SLUG (name OR title)
---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auto_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_row    jsonb := to_jsonb(NEW);
    v_source text;
BEGIN
    IF NEW.slug IS NULL THEN
        -- Tables name their human label either `name` or `title`.
        v_source := COALESCE(v_row ->> 'name', v_row ->> 'title');
        IF v_source IS NOT NULL AND length(trim(v_source)) > 0 THEN
            NEW.slug := public.generate_slug(v_source);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

COMMIT;
