-- ============================================================================
-- PodMind AI — Migration 0005: Row Level Security
-- ----------------------------------------------------------------------------
-- Defense-in-depth. The FastAPI service role bypasses RLS (that is the
-- primary data path and enforces ownership in repositories); these policies
-- guarantee that the anon/authenticated keys used by the browser can never
-- read or write another user's rows — even if a future feature talks to
-- PostgREST directly.
--
-- Conventions:
--   * RLS enabled AND forced on every table.
--   * (select auth.uid()) instead of auth.uid() so the planner evaluates it
--     once per statement, not per row (Supabase performance guideline).
--   * Ledger tables are append/read-only: no UPDATE or DELETE policies exist,
--     so those operations are denied outright for non-service roles.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- profiles — users can read & update their own profile. INSERT/DELETE are
-- owned by the auth trigger / cascade, never by clients.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- ai_provider_configs
-- ---------------------------------------------------------------------------
alter table public.ai_provider_configs enable row level security;

create policy ai_provider_configs_all_own on public.ai_provider_configs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;

create policy projects_all_own on public.projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- folders
-- ---------------------------------------------------------------------------
alter table public.folders enable row level security;

create policy folders_all_own on public.folders
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------------
alter table public.tags enable row level security;

create policy tags_all_own on public.tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- research_items
-- ---------------------------------------------------------------------------
alter table public.research_items enable row level security;

create policy research_items_all_own on public.research_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- research_item_tags — user_id is denormalized onto the join row precisely
-- so this policy needs no subquery join.
-- ---------------------------------------------------------------------------
alter table public.research_item_tags enable row level security;

create policy research_item_tags_all_own on public.research_item_tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- topic_analyses — insert happens via API only; clients may read their own.
-- ---------------------------------------------------------------------------
alter table public.topic_analyses enable row level security;

create policy topic_analyses_select_own on public.topic_analyses
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- chat_sessions / chat_messages
-- ---------------------------------------------------------------------------
alter table public.chat_sessions enable row level security;

create policy chat_sessions_all_own on public.chat_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.chat_messages enable row level security;

-- Read own messages; writing goes through the API (which also produces the
-- assistant reply), so clients get SELECT only.
create policy chat_messages_select_own on public.chat_messages
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
alter table public.notes enable row level security;

create policy notes_all_own on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- credit_transactions — read-only ledger for clients. No INSERT/UPDATE/DELETE
-- policies: balance changes happen only through SECURITY DEFINER functions
-- and the service role.
-- ---------------------------------------------------------------------------
alter table public.credit_transactions enable row level security;

create policy credit_transactions_select_own on public.credit_transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- activity_log — read-only feed for clients.
-- ---------------------------------------------------------------------------
alter table public.activity_log enable row level security;

create policy activity_log_select_own on public.activity_log
  for select to authenticated
  using (user_id = (select auth.uid()));
