-- ============================================================
-- 35_function_grants_hardening.sql
-- Least-privilege EXECUTE grants for internal functions.
--
-- Context: 34_generic_trigger_fixes.sql made audit_trigger() schema-agnostic
-- and SECURITY DEFINER. Supabase exposes every public function over PostgREST
-- RPC, so a definer-rights trigger function became callable by any anon or
-- authenticated client. Trigger functions are never called directly by
-- clients, so EXECUTE is revoked from the API roles.
--
-- RLS helper functions stay executable by `authenticated`: policies call them
-- as the requesting user and they only read that user's own membership.
-- ============================================================

-- Trigger-only functions: revoke from every client-facing role.
revoke execute on function public.audit_trigger()      from public, anon, authenticated;
revoke execute on function public.auto_slug()          from public, anon, authenticated;
revoke execute on function public.update_updated_at()  from public, anon, authenticated;

-- Privilege-escalating helper: internal use only, never client-callable.
revoke execute on function public.is_super_admin()     from public, anon, authenticated;

-- Triggers execute with the table owner's rights, so this grant is enough
-- for them to keep firing.
grant execute on function public.audit_trigger()       to postgres, service_role;
grant execute on function public.auto_slug()           to postgres, service_role;
grant execute on function public.update_updated_at()   to postgres, service_role;
grant execute on function public.is_super_admin()      to postgres, service_role;
