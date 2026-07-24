-- ============================================================
-- 42_auto_slug_collision.sql
-- Make auto_slug() resolve collisions instead of failing.
--
-- generate_slug() only slugifies; it has no idea whether the result is
-- already taken. Tables with a unique constraint on slug therefore raised a
-- duplicate-key error, which reached the user as an unexplained 500.
--
-- Found by a test that researched two guests with the same name in one
-- project — which is not an edge case. Two people share a name, or the same
-- person is looked up twice, and podcast titles repeat across seasons.
--
-- Uniqueness is enforced per table rather than per constraint scope. That is
-- stricter than some constraints require, but it always satisfies them and
-- avoids the trigger needing to know each table's scoping columns.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.auto_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
    v_row      jsonb := to_jsonb(NEW);
    v_source   text;
    v_base     text;
    v_slug     text;
    v_counter  integer := 1;
    v_taken    boolean;
BEGIN
    IF NEW.slug IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Tables name their human label `name`, `title`, or `full_name`.
    v_source := COALESCE(
        v_row ->> 'name',
        v_row ->> 'title',
        v_row ->> 'full_name'
    );

    IF v_source IS NULL OR length(trim(v_source)) = 0 THEN
        RETURN NEW;
    END IF;

    v_base := public.generate_slug(v_source);
    v_slug := v_base;

    LOOP
        EXECUTE format(
            'SELECT EXISTS(SELECT 1 FROM %I.%I WHERE slug = $1)',
            TG_TABLE_SCHEMA, TG_TABLE_NAME
        ) INTO v_taken USING v_slug;

        EXIT WHEN NOT v_taken;

        v_counter := v_counter + 1;
        v_slug := v_base || '-' || v_counter;

        -- A pathological loop is worse than an imperfect slug.
        EXIT WHEN v_counter > 1000;
    END LOOP;

    NEW.slug := v_slug;
    RETURN NEW;
END;
$$;

-- CREATE OR REPLACE resets grants, so 35_function_grants_hardening is re-applied.
REVOKE EXECUTE ON FUNCTION public.auto_slug() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_slug() TO postgres, service_role;

COMMIT;
