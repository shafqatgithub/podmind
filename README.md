# PodMind AI

> **Research Less. Create More.** — AI-powered podcast research platform.

Monorepo for the PodMind AI platform. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the full system design that all modules conform to.

## Repository status

| Module | Contents | Status |
| ------ | -------- | ------ |
| 1 | Architecture + Database layer (`supabase/`) | ✅ Complete, tested |
| 2 | FastAPI backend core (`apps/api`) | ⏳ Next |
| 3 | AI Provider Manager | ⏳ |
| 4 | Feature APIs (Projects, Topic Finder, Research Agent, Library, Chat, Notes) | ⏳ |
| 5 | Next.js frontend foundation (`apps/web`) | ⏳ |
| 6 | Frontend features | ⏳ |
| 7 | Export engine + deployment (Vercel/Railway/CI) | ⏳ |

## Database — applying migrations

Requirements: [Supabase CLI](https://supabase.com/docs/guides/cli) ≥ 1.200, a Supabase project.

```bash
# Link your project once
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push
```

Migrations live in `supabase/migrations/` and are strictly ordered:

1. `…0001_extensions_and_types.sql` — pgcrypto/pg_trgm/citext, all enums
2. `…0002_tables.sql` — 12 core tables with constraints
3. `…0003_functions_and_triggers.sql` — signup provisioning, credit ledger, counters
4. `…0004_indexes.sql` — indexes mapped to real query paths
5. `…0005_rls_policies.sql` — row-level security on every table
6. `…0006_storage.sql` — `avatars` and `exports` buckets + object policies

## Database — running the test suite locally

The schema is validated against vanilla PostgreSQL 16 using a Supabase
environment shim (no Supabase project needed):

```bash
./supabase/tests/run_tests.sh          # requires local postgres + createdb rights
```

The suite covers: signup provisioning, credit grant/spend/overdraft/refund
atomicity, denormalized counter sync, the completed-requires-content
constraint, full-text search, RLS tenant isolation, and ledger immutability.

## Post-migration Supabase dashboard configuration

These are dashboard settings (not expressible in SQL migrations):

1. **Auth → Providers**: enable **Email** (with "Confirm email" ON) and
   **Google** (add OAuth client ID/secret from Google Cloud Console).
2. **Auth → URL Configuration**: set Site URL to your Vercel domain; add
   `http://localhost:3000/**` to redirect allow-list for development.
3. **Auth → Email Templates**: customize confirmation & recovery emails
   (branded templates ship with Module 5).
