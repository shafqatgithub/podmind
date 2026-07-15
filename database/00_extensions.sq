/*
=========================================================
 PodMind AI
 Database Migration
 File: 00_extensions.sql
 Version: 1.0
=========================================================
*/

BEGIN;

---------------------------------------------------------
-- UUID Generation
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS pgcrypto;

---------------------------------------------------------
-- Case Insensitive Text
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS citext;

---------------------------------------------------------
-- Trigram Search
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm;

---------------------------------------------------------
-- Full Text Search Helpers
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent;

---------------------------------------------------------
-- Vector Search (AI / RAG)
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;

---------------------------------------------------------
-- Key Value Store
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS hstore;

---------------------------------------------------------
-- Tree Structures
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS ltree;

---------------------------------------------------------
-- Monitoring & Statistics
---------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

---------------------------------------------------------
-- Optional (Enable Only If Required)
---------------------------------------------------------

-- CREATE EXTENSION IF NOT EXISTS postgres_fdw;
-- CREATE EXTENSION IF NOT EXISTS file_fdw;

---------------------------------------------------------
-- Verify Installed Extensions
---------------------------------------------------------

COMMENT ON EXTENSION "uuid-ossp"
IS 'UUID generation support';

COMMENT ON EXTENSION pgcrypto
IS 'Cryptographic functions';

COMMENT ON EXTENSION citext
IS 'Case-insensitive text';

COMMENT ON EXTENSION pg_trgm
IS 'Trigram similarity search';

COMMENT ON EXTENSION unaccent
IS 'Remove accents for full text search';

COMMENT ON EXTENSION vector
IS 'Vector embeddings for AI semantic search';

COMMENT ON EXTENSION hstore
IS 'Key-value data type';

COMMENT ON EXTENSION ltree
IS 'Hierarchical tree structures';

COMMENT ON EXTENSION pg_stat_statements
IS 'SQL query statistics';

COMMIT;

---------------------------------------------------------
-- Installed Extensions Checklist
---------------------------------------------------------

/*

✓ uuid-ossp

Purpose:
Generate UUID primary keys.

--------------------------------------

✓ pgcrypto

Purpose:
Encryption
Random UUID generation
Secure hashing

--------------------------------------

✓ citext

Purpose:
Case-insensitive email and usernames.

--------------------------------------

✓ pg_trgm

Purpose:
Fuzzy search
Similarity search
Autocomplete

--------------------------------------

✓ unaccent

Purpose:
Improved full-text search.

--------------------------------------

✓ vector

Purpose:
Semantic Search
Embeddings
RAG
AI Memory

--------------------------------------

✓ hstore

Purpose:
Flexible metadata storage.

--------------------------------------

✓ ltree

Purpose:
Knowledge Graph
Topic hierarchy
Category trees

--------------------------------------

✓ pg_stat_statements

Purpose:
Database performance monitoring.

*/

---------------------------------------------------------
-- Future Extensions
---------------------------------------------------------

/*

Potential Future Extensions

- pg_cron
  Scheduled jobs

- postgis
  Geographic search

- pgmq
  Message queues

- pg_net
  HTTP requests from PostgreSQL

- timescaledb
  Time-series analytics

These should only be enabled when required.

*/

---------------------------------------------------------
-- End Of File
---------------------------------------------------------
