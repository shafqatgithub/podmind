-- ============================================================================
-- PodMind AI — Migration 0007: Security Hardening (advisor remediations)
-- ----------------------------------------------------------------------------
-- Applied to production on 2026-07-15 after Supabase security advisors
-- flagged two issues introduced by defaults:
--
-- 1) SECURITY DEFINER functions were callable by anon/authenticated via
--    PostgREST RPC (/rest/v1/rpc/*). Credit functions in particular must be
--    invocable ONLY by the service role (FastAPI) and internal triggers —
--    otherwise a signed-in user could mint credits via refund_credits.
-- 2) Public 'avatars' bucket had a broad SELECT policy that let clients LIST
--    every object. Public buckets serve object URLs without any policy, so
--    the listing policy is dropped.
-- ============================================================================

revoke execute on function public.handle_new_user()                              from public, anon, authenticated;
revoke execute on function public.apply_credit_transaction()                     from public, anon, authenticated;
revoke execute on function public.consume_credits(uuid, integer, text, uuid)     from public, anon, authenticated;
revoke execute on function public.refund_credits(uuid, integer, text, uuid)      from public, anon, authenticated;
revoke execute on function public.sync_project_research_count()                  from public, anon, authenticated;
revoke execute on function public.touch_project_on_chat()                        from public, anon, authenticated;
revoke execute on function public.set_updated_at()                               from public, anon, authenticated;

-- Ensure future functions never default to publicly executable in this schema.
alter default privileges in schema public revoke execute on functions from public;

-- Public bucket object URLs work without a SELECT policy; only listing needs
-- one — and we don't want listing.
drop policy if exists storage_avatars_read on storage.objects;
