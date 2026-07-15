-- ============================================================================
-- LOCAL TEST SHIM — NOT A MIGRATION. DO NOT DEPLOY.
-- ----------------------------------------------------------------------------
-- Recreates the minimal Supabase surface (schemas, roles, auth.users,
-- auth.uid(), storage tables, storage.foldername) so the real migrations in
-- supabase/migrations/ can be validated against vanilla PostgreSQL 16 in CI.
-- On an actual Supabase project these objects already exist.
-- ============================================================================

create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

-- Minimal auth.users mirroring the columns our trigger reads.
create table if not exists auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz default now()
);

-- auth.uid() — returns the JWT subject; stubbed from a session GUC here.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- Minimal storage schema.
create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets (id),
  name       text,
  owner      uuid,
  created_at timestamptz default now()
);

create or replace function storage.foldername(name text)
returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1 : array_upper(string_to_array(name, '/'), 1) - 1]
$$;

grant usage on schema public, extensions, storage to authenticated, anon;

-- Supabase grants table/sequence/function privileges to these roles by
-- default; RLS is what actually restricts rows. Mirror that here so the
-- tests exercise policies rather than missing GRANTs.
alter default privileges in schema public
  grant all on tables to authenticated, anon, service_role;
alter default privileges in schema public
  grant all on sequences to authenticated, anon, service_role;
alter default privileges in schema public
  grant execute on functions to authenticated, anon, service_role;
