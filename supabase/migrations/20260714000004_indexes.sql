-- ============================================================================
-- PodMind AI — Migration 0004: Indexes
-- ----------------------------------------------------------------------------
-- Every index below maps to a concrete query the API or dashboard runs.
-- No speculative indexes: they cost write throughput and are added when a
-- real access path demands them.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
-- Dashboard "Recent Projects" + project list: newest activity first,
-- excluding soft-deleted rows. Partial index keeps it small and hot.
create index idx_projects_user_recent
  on public.projects (user_id, last_activity_at desc)
  where deleted_at is null;

-- Project search (Feature 3): fuzzy ILIKE '%term%' via trigram.
create index idx_projects_name_trgm
  on public.projects using gin (name extensions.gin_trgm_ops)
  where deleted_at is null;

-- ---------------------------------------------------------------------------
-- research_items
-- ---------------------------------------------------------------------------
-- Project detail view: items of a project, newest first.
create index idx_research_items_project
  on public.research_items (project_id, created_at desc);

-- Research Library default view + filters (archived toggle handled by the
-- API adding "and is_archived = false"; column is low-cardinality so the
-- composite below serves both).
create index idx_research_items_user_library
  on public.research_items (user_id, is_archived, created_at desc);

-- "Favorites" filter — small partial index.
create index idx_research_items_user_favorites
  on public.research_items (user_id, created_at desc)
  where is_favorite = true;

-- Folder view.
create index idx_research_items_folder
  on public.research_items (folder_id)
  where folder_id is not null;

-- Full-text search across the library.
create index idx_research_items_search
  on public.research_items using gin (search_vector);

-- Fuzzy topic match (typeahead / dedupe suggestions).
create index idx_research_items_topic_trgm
  on public.research_items using gin (topic extensions.gin_trgm_ops);

-- Background worker: claim pending/processing jobs.
create index idx_research_items_status_active
  on public.research_items (status, created_at)
  where status in ('pending', 'processing');

-- ---------------------------------------------------------------------------
-- research_item_tags
-- ---------------------------------------------------------------------------
-- PK covers (research_item_id, tag_id); reverse lookup "items with tag X":
create index idx_research_item_tags_tag
  on public.research_item_tags (tag_id, research_item_id);

-- ---------------------------------------------------------------------------
-- folders / tags — small per-user sets, listed alphabetically.
-- ---------------------------------------------------------------------------
create index idx_folders_user on public.folders (user_id, position, name);
create index idx_tags_user    on public.tags    (user_id, name);

-- ---------------------------------------------------------------------------
-- topic_analyses
-- ---------------------------------------------------------------------------
-- Cache lookup: latest analysis for a user's query.
create index idx_topic_analyses_user_query
  on public.topic_analyses (user_id, query, created_at desc);

-- Dashboard "Trending Topics": recent analyses across the user's history.
create index idx_topic_analyses_user_recent
  on public.topic_analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------------
create index idx_chat_sessions_project
  on public.chat_sessions (project_id, updated_at desc);

-- Message history load: strictly ordered scan within a session.
create index idx_chat_messages_session
  on public.chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- notes
-- ---------------------------------------------------------------------------
create index idx_notes_research_item
  on public.notes (research_item_id, created_at);

create index idx_notes_user_type
  on public.notes (user_id, type, created_at desc);

-- ---------------------------------------------------------------------------
-- ledgers / feeds — always read newest-first per user.
-- ---------------------------------------------------------------------------
create index idx_credit_transactions_user
  on public.credit_transactions (user_id, created_at desc);

create index idx_activity_log_user
  on public.activity_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- ai_provider_configs — unique(user_id, provider) already indexes the only
-- lookup path; nothing further needed.
-- ---------------------------------------------------------------------------
