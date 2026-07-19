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
        v_source := COALESCE(v_row ->> 'name', v_row ->> 'title');
        IF v_source IS NOT NULL AND length(trim(v_source)) > 0 THEN
            NEW.slug := public.generate_slug(v_source);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;