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
UPDATE public.guests
   SET slug = public.generate_slug(full_name)
 WHERE slug IS NULL
   AND full_name IS NOT NULL
   AND length(trim(full_name)) > 0;
REVOKE EXECUTE ON FUNCTION public.auto_slug() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_slug() TO postgres, service_role;
