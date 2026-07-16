/*
=========================================================
 PodMind AI
 Database Migration
 File: 33_security_hardening.sql
 Version: 1.0
 Purpose: Supabase security-advisor remediations applied
          after the full schema deploy (2026-07-16).
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- 1) LOOKUP TABLES: RLS + read-only catalog policies
--    (advisor ERRORs: RLS disabled in public)
---------------------------------------------------------

ALTER TABLE public.project_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_formats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Catalog readable" ON public.project_types
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalog readable" ON public.export_formats
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalog readable" ON public.social_platforms
    FOR SELECT TO authenticated USING (true);

---------------------------------------------------------
-- 2) SEEDED CATALOGS: signed-in users may read
--    (plans/providers/models/agents/categories power the UI)
---------------------------------------------------------

CREATE POLICY "Catalog readable" ON public.subscription_plans
    FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Catalog readable" ON public.ai_providers
    FOR SELECT TO authenticated USING (is_active = TRUE);

CREATE POLICY "Catalog readable" ON public.ai_models
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalog readable" ON public.ai_agents
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalog readable" ON public.template_categories
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Catalog readable" ON public.marketplace_categories
    FOR SELECT TO authenticated USING (true);

---------------------------------------------------------
-- 3) SECURITY DEFINER exposure
--    handle_new_user: trigger-only — nobody calls it via RPC.
--    RLS helpers: must stay executable by authenticated
--    (policies evaluate them as the querying role) but not anon.
---------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_organization_id()      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_organization_member(uuid)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin()                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin()               FROM PUBLIC, anon;

---------------------------------------------------------
-- 4) EXTENSIONS: move out of public schema
--    (Supabase default search_path already includes extensions)
---------------------------------------------------------

ALTER EXTENSION unaccent SET SCHEMA extensions;
ALTER EXTENSION vector   SET SCHEMA extensions;
ALTER EXTENSION hstore   SET SCHEMA extensions;
ALTER EXTENSION ltree    SET SCHEMA extensions;

---------------------------------------------------------
-- 5) PIN search_path ON EVERY public FUNCTION
--    (prevents search_path hijacking on SECURITY DEFINER
--     and trigger functions; bodies use unqualified public
--     names so the pin keeps public first)
---------------------------------------------------------

DO $harden$
DECLARE
    fn RECORD;
BEGIN
    FOR fn IN
        SELECT p.oid::regprocedure AS signature
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.prokind = 'f'
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path = public, extensions, pg_temp',
            fn.signature
        );
    END LOOP;
END
$harden$;

COMMIT;
