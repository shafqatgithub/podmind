-- ============================================================
-- 39_guest_slug.sql
-- Populate guests.slug.
--
-- Two defects in the documented schema, found while building the Guest
-- Intelligence module:
--
-- 1) 08_guests.sql defines guests.slug and indexes it (idx_guest_slug), but
--    30_triggers.sql only attaches auto_slug() to projects, templates and
--    marketplace_items. Every guest row was therefore inserted with a NULL
--    slug and the index served nothing.
--
-- 2) auto_slug() derives the slug from `name` or `title` (34_generic_trigger_fixes).
--    Guests carry their human label in `full_name`, so even with the trigger
--    attached no slug would have been produced.
--
-- Both are fixed here: the function learns `full_name`, and the trigger is
-- attached to guests. Existing rows are backfilled.
-- ============================================================

BEGIN;

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
        -- Tables name their human label `name`, `title`, or `full_name`.
        v_source := COALESCE(
            v_row ->> 'name',
            v_row ->> 'title',
            v_row ->> 'full_name'
        );
        IF v_source IS NOT NULL AND length(trim(v_source)) > 0 THEN
            NEW.slug := public.generate_slug(v_source);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guests_slug ON public.guests;
CREATE TRIGGER trg_guests_slug
BEFORE INSERT
ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.auto_slug();

-- Backfill rows created before the trigger existed.
UPDATE public.guests
   SET slug = public.generate_slug(full_name)
 WHERE slug IS NULL
   AND full_name IS NOT NULL
   AND length(trim(full_name)) > 0;

-- The function was recreated, so re-apply the least-privilege grants from
-- 35_function_grants_hardening.sql (CREATE OR REPLACE resets them).
REVOKE EXECUTE ON FUNCTION public.auto_slug() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_slug() TO postgres, service_role;

COMMIT;
