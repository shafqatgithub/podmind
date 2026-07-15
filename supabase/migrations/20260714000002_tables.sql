-- ============================================================================
-- PodMind AI — Migration 0002: Core Tables
-- ----------------------------------------------------------------------------
-- Ownership model: every user-owned row carries user_id -> profiles.id.
-- Child rows that are always accessed through a parent (chat_messages,
-- research_item_tags) derive ownership through the parent but still store
-- enough FKs for cheap RLS checks.
-- All PKs are UUIDs (gen_random_uuid). All timestamps are timestamptz.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles — application-level user record, 1:1 with auth.users.
-- Created automatically by the handle_new_user trigger (migration 0003).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text not null,
  full_name          text,
  avatar_url         text,
  -- Cached credit balance. NEVER written directly by application code:
  -- maintained exclusively by the credit ledger trigger. CHECK is the final
  -- guard against double-spend races.
  ai_credits         integer not null default 0 check (ai_credits >= 0),
  -- Which provider the AI Provider Manager uses when the user hasn't chosen
  -- one per-request.
  default_provider   public.ai_provider not null default 'claude',
  onboarded_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table  public.profiles is 'App profile, 1:1 with auth.users; row created by trigger on signup.';
comment on column public.profiles.ai_credits is 'Cached balance derived from credit_transactions. Trigger-maintained only.';

-- ----------------------------------------------------------------------------
-- ai_provider_configs — per-user provider settings (model choice, optional
-- BYOK key). One row per (user, provider).
-- ----------------------------------------------------------------------------
create table public.ai_provider_configs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  provider            public.ai_provider not null,
  -- Model identifier as understood by the provider (e.g. 'claude-sonnet-4-6').
  -- Validated against the provider registry in the API layer.
  model               text not null,
  -- User-supplied API key, encrypted application-side (Fernet). The database
  -- never sees plaintext. NULL means "use platform key + credits".
  api_key_ciphertext  text,
  is_enabled          boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, provider)
);

comment on column public.ai_provider_configs.api_key_ciphertext is
  'Fernet ciphertext of user BYOK key; encrypted in the API layer, never stored in plaintext.';

-- ----------------------------------------------------------------------------
-- projects — top-level container for research work.
-- Soft delete: deleted_at set on delete, purged by a scheduled job after 30d.
-- ----------------------------------------------------------------------------
create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text check (char_length(description) <= 2000),
  status       public.project_status not null default 'active',
  color        public.color_label not null default 'violet',
  -- Denormalized counter kept accurate by trigger; avoids COUNT(*) on the
  -- dashboard's "Recent Projects" cards.
  research_count integer not null default 0 check (research_count >= 0),
  last_activity_at timestamptz not null default now(),
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.projects.deleted_at is 'Soft delete marker; rows purged by scheduled job after 30 days.';

-- ----------------------------------------------------------------------------
-- folders — Research Library organization. Single level by design for MVP 1
-- (no parent_id): nesting is a product decision deferred, and adding it later
-- is an additive migration.
-- ----------------------------------------------------------------------------
create table public.folders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  color      public.color_label not null default 'slate',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ----------------------------------------------------------------------------
-- tags — user-defined labels. citext dedupes case variants.
-- ----------------------------------------------------------------------------
create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       extensions.citext not null check (char_length(name::text) between 1 and 40),
  color      public.color_label not null default 'blue',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ----------------------------------------------------------------------------
-- research_items — output of the AI Research Agent (Feature 5) and the unit
-- stored in the Research Library (Feature 6).
--
-- content JSONB shape (content_version = 1), produced & validated by the API:
-- {
--   "summary": str,
--   "key_points": [str],
--   "statistics": [{"claim": str, "value": str, "source": str|null}],
--   "facts": [str],
--   "pros": [str], "cons": [str],
--   "timeline": [{"date": str, "event": str}],
--   "latest_news": [{"headline": str, "summary": str, "source": str|null, "date": str|null}],
--   "common_myths": [{"myth": str, "reality": str}],
--   "expert_opinions": [{"expert": str, "credential": str|null, "opinion": str}],
--   "discussion_ideas": [str],
--   "references": [{"title": str, "url": str|null, "publisher": str|null}],
--   "audience_questions": [str],
--   "podcast_angles": [{"title": str, "hook": str}]
-- }
-- ----------------------------------------------------------------------------
create table public.research_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  project_id       uuid not null references public.projects (id) on delete cascade,
  folder_id        uuid references public.folders (id) on delete set null,
  topic            text not null check (char_length(topic) between 1 and 300),
  status           public.research_status not null default 'pending',
  -- Provider + model actually used, recorded for cost attribution & debugging.
  provider         public.ai_provider,
  model            text,
  content          jsonb,
  content_version  smallint not null default 1,
  error_message    text,                       -- populated when status = 'failed'
  is_favorite      boolean not null default false,
  is_archived      boolean not null default false,
  credits_spent    integer not null default 0 check (credits_spent >= 0),
  input_tokens     integer not null default 0,
  output_tokens    integer not null default 0,
  -- Full-text search over topic + summary. Generated column so it can never
  -- drift from the data; GIN-indexed in migration 0004.
  search_vector    tsvector generated always as (
                     setweight(to_tsvector('english', coalesce(topic, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(content ->> 'summary', '')), 'B')
                   ) stored,
  completed_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- A completed item must actually contain content.
  constraint research_completed_has_content
    check (status <> 'completed' or content is not null)
);

comment on column public.research_items.content is
  'Structured research document (JSON schema versioned by content_version, validated in API layer).';

-- ----------------------------------------------------------------------------
-- research_item_tags — n:n join. user_id duplicated for a cheap RLS predicate
-- (avoids a join inside the policy on every read).
-- ----------------------------------------------------------------------------
create table public.research_item_tags (
  research_item_id uuid not null references public.research_items (id) on delete cascade,
  tag_id           uuid not null references public.tags (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (research_item_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- topic_analyses — output of the AI Topic Finder (Feature 4). Cached per user
-- so re-searching a topic is free; the API decides staleness via created_at.
-- Scores are real columns (0–100) because the UI sorts and filters on them.
-- ----------------------------------------------------------------------------
create table public.topic_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  query             text not null check (char_length(query) between 1 and 300),
  topic             text not null,
  topic_score       smallint not null check (topic_score       between 0 and 100),
  virality_score    smallint not null check (virality_score    between 0 and 100),
  competition_score smallint not null check (competition_score between 0 and 100),
  evergreen_score   smallint not null check (evergreen_score   between 0 and 100),
  difficulty_score  smallint not null check (difficulty_score  between 0 and 100),
  -- Estimated reachable audience (order-of-magnitude figure from the model).
  audience_size     bigint not null default 0 check (audience_size >= 0),
  -- [{"topic": str, "reason": str}] — suggestions rendered as chips.
  related_topics    jsonb not null default '[]'::jsonb,
  -- [{"topic": str, "momentum": str}] — trending list for the query niche.
  trending_topics   jsonb not null default '[]'::jsonb,
  provider          public.ai_provider not null,
  model             text not null,
  credits_spent     integer not null default 0 check (credits_spent >= 0),
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- chat_sessions / chat_messages — AI Research Chat (Feature 7).
-- A project can hold multiple sessions ("New chat" per thread).
-- ----------------------------------------------------------------------------
create table public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  project_id  uuid not null references public.projects (id) on delete cascade,
  title       text not null default 'New chat' check (char_length(title) between 1 and 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.chat_sessions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.chat_role not null,
  content       text not null check (char_length(content) between 1 and 32000),
  provider      public.ai_provider,          -- set on assistant messages
  model         text,
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  credits_spent integer not null default 0 check (credits_spent >= 0),
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notes — Smart Notes (Feature 8): highlights, bookmarks, notes, comments.
-- anchor JSONB pins a note to a location inside research content:
--   {"section": "key_points", "index": 2, "start": 10, "end": 84, "quote": str}
-- Kept as JSONB because anchoring strategy is a frontend concern that will
-- iterate; the DB only guarantees it is an object.
-- ----------------------------------------------------------------------------
create table public.notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  research_item_id  uuid not null references public.research_items (id) on delete cascade,
  type              public.note_type not null,
  -- Body is required for notes/comments; highlights & bookmarks may be bare.
  body              text check (char_length(body) <= 8000),
  color             public.color_label not null default 'amber',
  anchor            jsonb not null default '{}'::jsonb check (jsonb_typeof(anchor) = 'object'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint notes_body_required_for_text_types
    check (type in ('highlight', 'bookmark') or body is not null)
);

-- ----------------------------------------------------------------------------
-- credit_transactions — append-only ledger. The ONLY way balances change.
-- Sign discipline enforced per transaction type.
-- ----------------------------------------------------------------------------
create table public.credit_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         public.credit_transaction_type not null,
  amount       integer not null check (amount <> 0),
  description  text not null check (char_length(description) between 1 and 300),
  -- Loose reference to what caused the spend (research_item id, chat id…).
  reference_id uuid,
  created_at   timestamptz not null default now(),
  constraint credit_amount_sign check (
    (type in ('signup_grant', 'plan_grant', 'bonus', 'refund') and amount > 0)
    or (type = 'consume' and amount < 0)
    or (type = 'adjustment')
  )
);

comment on table public.credit_transactions is
  'Append-only credit ledger. profiles.ai_credits is derived from this table by trigger.';

-- ----------------------------------------------------------------------------
-- activity_log — append-only feed powering the Dashboard "Recent Activity".
-- action is free text vocabulary controlled by the API layer
-- ('project.created', 'research.completed', …) — kept as text so adding a new
-- activity kind never requires a migration.
-- ----------------------------------------------------------------------------
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  action      text not null check (char_length(action) between 1 and 60),
  entity_type text not null check (char_length(entity_type) between 1 and 40),
  entity_id   uuid,
  metadata    jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at  timestamptz not null default now()
);
