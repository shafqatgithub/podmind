-- ============================================================================
-- PodMind AI — Schema smoke tests (run in CI against a fresh migrate).
-- Each block raises an exception on failure; a clean run prints OK lines.
-- ============================================================================
\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- T1: signup trigger creates profile + 100 welcome credits via the ledger.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('11111111-1111-1111-1111-111111111111', 'alice@example.com',
        '{"full_name": "Alice Rivera"}');

do $$
declare v_credits int; v_ledger int;
begin
  select ai_credits into v_credits from public.profiles
   where id = '11111111-1111-1111-1111-111111111111';
  select count(*) into v_ledger from public.credit_transactions
   where user_id = '11111111-1111-1111-1111-111111111111' and type = 'signup_grant';
  if v_credits <> 100 or v_ledger <> 1 then
    raise exception 'T1 FAILED: credits=% ledger_rows=%', v_credits, v_ledger;
  end if;
  raise notice 'T1 OK: signup grant = 100 credits via ledger';
end $$;

-- ---------------------------------------------------------------------------
-- T2: consume_credits spends atomically and updates the cached balance.
-- ---------------------------------------------------------------------------
do $$
declare v_tx uuid; v_credits int;
begin
  v_tx := public.consume_credits(
    '11111111-1111-1111-1111-111111111111', 30, 'Research: AI in Healthcare');
  select ai_credits into v_credits from public.profiles
   where id = '11111111-1111-1111-1111-111111111111';
  if v_credits <> 70 then
    raise exception 'T2 FAILED: expected 70, got %', v_credits;
  end if;
  raise notice 'T2 OK: consume 30 -> balance 70 (tx %)', v_tx;
end $$;

-- ---------------------------------------------------------------------------
-- T3: overdraft is rejected with INSUFFICIENT_CREDITS and balance unchanged.
-- ---------------------------------------------------------------------------
do $$
declare v_credits int;
begin
  begin
    perform public.consume_credits(
      '11111111-1111-1111-1111-111111111111', 9999, 'Overdraft attempt');
    raise exception 'T3 FAILED: overdraft was allowed';
  exception when others then
    if sqlerrm <> 'INSUFFICIENT_CREDITS' then raise; end if;
  end;
  select ai_credits into v_credits from public.profiles
   where id = '11111111-1111-1111-1111-111111111111';
  if v_credits <> 70 then
    raise exception 'T3 FAILED: balance changed to %', v_credits;
  end if;
  raise notice 'T3 OK: overdraft blocked, balance intact';
end $$;

-- ---------------------------------------------------------------------------
-- T4: refund restores balance and leaves an audit trail.
-- ---------------------------------------------------------------------------
do $$
declare v_credits int;
begin
  perform public.refund_credits(
    '11111111-1111-1111-1111-111111111111', 30, 'Refund: research failed');
  select ai_credits into v_credits from public.profiles
   where id = '11111111-1111-1111-1111-111111111111';
  if v_credits <> 100 then
    raise exception 'T4 FAILED: expected 100, got %', v_credits;
  end if;
  raise notice 'T4 OK: refund restored balance to 100';
end $$;

-- ---------------------------------------------------------------------------
-- T5: research_count counter + completed-requires-content constraint.
-- ---------------------------------------------------------------------------
insert into public.projects (id, user_id, name)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'The Future of Sleep Science');

insert into public.research_items (user_id, project_id, topic, status, provider, model, content)
values ('11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'Polyphasic sleep: evidence vs hype', 'completed', 'claude', 'claude-sonnet-4-6',
        '{"summary": "Overview of polyphasic sleep research.", "key_points": ["REM debt accumulates"]}');

do $$
declare v_count int;
begin
  select research_count into v_count from public.projects
   where id = '22222222-2222-2222-2222-222222222222';
  if v_count <> 1 then
    raise exception 'T5a FAILED: research_count=%', v_count;
  end if;

  begin
    insert into public.research_items (user_id, project_id, topic, status)
    values ('11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222', 'No content item', 'completed');
    raise exception 'T5b FAILED: completed item without content was allowed';
  exception when check_violation then null;
  end;
  raise notice 'T5 OK: counter synced, completed-requires-content enforced';
end $$;

-- ---------------------------------------------------------------------------
-- T6: full-text search vector finds the item.
-- ---------------------------------------------------------------------------
do $$
declare v_hits int;
begin
  select count(*) into v_hits from public.research_items
   where search_vector @@ websearch_to_tsquery('english', 'polyphasic sleep');
  if v_hits <> 1 then
    raise exception 'T6 FAILED: expected 1 hit, got %', v_hits;
  end if;
  raise notice 'T6 OK: full-text search works';
end $$;

-- ---------------------------------------------------------------------------
-- T7: RLS isolation — Bob cannot see Alice's projects; Alice sees hers.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('33333333-3333-3333-3333-333333333333', 'bob@example.com');

set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';

do $$
declare v int;
begin
  select count(*) into v from public.projects;
  if v <> 0 then raise exception 'T7a FAILED: Bob sees % foreign projects', v; end if;
end $$;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

do $$
declare v int;
begin
  select count(*) into v from public.projects;
  if v <> 1 then raise exception 'T7b FAILED: Alice sees % projects', v; end if;
  raise notice 'T7 OK: RLS isolates tenants';
end $$;

-- T8: ledger is append-only for clients (no UPDATE policy -> 0 rows updated).
do $$
declare v int;
begin
  update public.credit_transactions set description = 'tampered';
  get diagnostics v = row_count;
  if v <> 0 then raise exception 'T8 FAILED: client mutated % ledger rows', v; end if;
  raise notice 'T8 OK: ledger append-only for clients';
end $$;

reset role;
\echo ALL SMOKE TESTS PASSED
