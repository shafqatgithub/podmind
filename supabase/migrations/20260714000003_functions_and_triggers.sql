-- ============================================================================
-- PodMind AI — Migration 0003: Functions & Triggers
-- ----------------------------------------------------------------------------
-- All functions are SECURITY DEFINER with an explicit, empty-safe search_path
-- (Supabase hardening guideline) so they cannot be hijacked via search_path
-- injection.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- set_updated_at — generic touch trigger for every mutable table.
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_ai_provider_configs_updated_at
  before update on public.ai_provider_configs
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger trg_folders_updated_at
  before update on public.folders
  for each row execute function public.set_updated_at();

create trigger trg_research_items_updated_at
  before update on public.research_items
  for each row execute function public.set_updated_at();

create trigger trg_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

create trigger trg_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- handle_new_user — fires when Supabase Auth inserts into auth.users.
-- Creates the profile and issues the signup credit grant through the ledger
-- (never by writing ai_credits directly), so day-one users are already fully
-- represented in the audit trail.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_credits constant integer := 100;
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.credit_transactions (user_id, type, amount, description)
  values (new.id, 'signup_grant', signup_credits, 'Welcome credits');

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- apply_credit_transaction — keeps profiles.ai_credits in sync with the
-- ledger. Because the ledger is append-only (enforced by RLS + no UPDATE/
-- DELETE policies and API discipline), this is the single writer of balances.
-- The CHECK (ai_credits >= 0) on profiles makes overdrafts impossible even
-- under concurrent inserts.
-- ----------------------------------------------------------------------------
create or replace function public.apply_credit_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set ai_credits = ai_credits + new.amount
   where id = new.user_id;
  return new;
end;
$$;

create trigger trg_apply_credit_transaction
  after insert on public.credit_transactions
  for each row execute function public.apply_credit_transaction();

-- ----------------------------------------------------------------------------
-- consume_credits — atomic spend used by the API before every AI call.
--
-- Locks the profile row, verifies the balance, writes the ledger entry
-- (which the trigger above applies). Raises 'INSUFFICIENT_CREDITS' — the API
-- maps that SQLSTATE message to HTTP 402.
--
-- Returns the ledger row id so refunds can reference it if the AI call fails.
-- ----------------------------------------------------------------------------
create or replace function public.consume_credits(
  p_user_id     uuid,
  p_amount      integer,          -- positive number of credits to spend
  p_description text,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_tx_id   uuid;
begin
  if p_amount <= 0 then
    raise exception 'consume_credits requires a positive amount, got %', p_amount
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  -- Serialize concurrent spends for this user.
  select ai_credits into v_balance
    from public.profiles
   where id = p_user_id
   for update;

  if v_balance is null then
    raise exception 'Profile % not found', p_user_id using errcode = 'P0002';
  end if;

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0001';
  end if;

  insert into public.credit_transactions (user_id, type, amount, description, reference_id)
  values (p_user_id, 'consume', -p_amount, p_description, p_reference_id)
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- refund_credits — compensating entry when an AI call fails after a spend.
-- ----------------------------------------------------------------------------
create or replace function public.refund_credits(
  p_user_id      uuid,
  p_amount       integer,
  p_description  text,
  p_reference_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx_id uuid;
begin
  if p_amount <= 0 then
    raise exception 'refund_credits requires a positive amount, got %', p_amount
      using errcode = '22023';
  end if;

  insert into public.credit_transactions (user_id, type, amount, description, reference_id)
  values (p_user_id, 'refund', p_amount, p_description, p_reference_id)
  returning id into v_tx_id;

  return v_tx_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- sync_project_research_count — keeps the denormalized counter and the
-- project's last_activity_at accurate on research insert/delete/move.
-- ----------------------------------------------------------------------------
create or replace function public.sync_project_research_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.projects
       set research_count = research_count + 1,
           last_activity_at = now()
     where id = new.project_id;
    return new;

  elsif tg_op = 'DELETE' then
    update public.projects
       set research_count = greatest(research_count - 1, 0)
     where id = old.project_id;
    return old;

  elsif tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    update public.projects
       set research_count = greatest(research_count - 1, 0)
     where id = old.project_id;
    update public.projects
       set research_count = research_count + 1,
           last_activity_at = now()
     where id = new.project_id;
    return new;
  end if;

  return new;
end;
$$;

create trigger trg_sync_project_research_count
  after insert or delete or update of project_id on public.research_items
  for each row execute function public.sync_project_research_count();

-- ----------------------------------------------------------------------------
-- touch_project_on_chat — chat activity bubbles up to the project so the
-- dashboard's "Recent Projects" ordering reflects real usage.
-- ----------------------------------------------------------------------------
create or replace function public.touch_project_on_chat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.projects p
     set last_activity_at = now()
    from public.chat_sessions s
   where s.id = new.session_id
     and p.id = s.project_id;
  return new;
end;
$$;

create trigger trg_touch_project_on_chat
  after insert on public.chat_messages
  for each row execute function public.touch_project_on_chat();
