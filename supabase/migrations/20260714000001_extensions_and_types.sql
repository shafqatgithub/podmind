-- ============================================================================
-- PodMind AI — Migration 0001: Extensions & Enum Types
-- ----------------------------------------------------------------------------
-- Foundation objects required by every subsequent migration.
-- Enums are used for closed, code-controlled vocabularies only. Anything a
-- user can extend (tags, folders) is a table, not an enum.
-- ============================================================================

-- gen_random_uuid(), digest() — pgcrypto is pre-installed on Supabase.
create extension if not exists "pgcrypto"  with schema extensions;
-- Trigram indexes for fast fuzzy ILIKE search (projects, topics).
create extension if not exists "pg_trgm"   with schema extensions;
-- Case-insensitive text for tag names (dedupe "AI" vs "ai").
create extension if not exists "citext"    with schema extensions;

-- ----------------------------------------------------------------------------
-- Enum types
-- ----------------------------------------------------------------------------

-- Lifecycle of a project. Soft delete is handled via projects.deleted_at,
-- not an enum value, so archived and deleted are orthogonal states.
create type public.project_status as enum ('active', 'archived');

-- Lifecycle of an AI research job. 'pending' -> 'processing' -> terminal.
create type public.research_status as enum ('pending', 'processing', 'completed', 'failed');

-- Supported AI providers. Extending this enum is a deliberate migration,
-- matching the AI Provider Manager registry in the API (Module 3).
create type public.ai_provider as enum ('openai', 'gemini', 'claude');

-- Smart Notes types (Feature 8).
create type public.note_type as enum ('highlight', 'bookmark', 'note', 'comment');

-- Color labels for notes and folders — fixed palette keeps the UI coherent.
create type public.color_label as enum
  ('slate', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink');

-- Credit ledger entry kinds. Amount sign is enforced per-kind by a CHECK
-- constraint on credit_transactions (grants positive, consumption negative).
create type public.credit_transaction_type as enum
  ('signup_grant', 'plan_grant', 'bonus', 'consume', 'refund', 'adjustment');

-- Chat message roles, mirroring provider APIs.
create type public.chat_role as enum ('user', 'assistant', 'system');
