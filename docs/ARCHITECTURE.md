> **SUPERSEDED (2026-07-16):** This was the MVP-1 architecture document.
> The 00–37 numbered documents in /docs are now the single source of truth.
> Backend is **NestJS** per explicit owner decision (see 02-System-Architecture.md).

# PodMind AI — System Architecture

> **Research Less. Create More.**
> MVP 1: AI Research Engine

This document is the single source of truth for architectural decisions.
Every module built after this one MUST conform to it.

---

## 1. High-Level Topology

```
┌──────────────────────────────────────────────────────────────────┐
│                           Browser / Mobile                        │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTPS
┌───────────────▼──────────────┐
│   Next.js 15 (Vercel)        │  App Router, RSC, Server Actions
│   apps/web                   │  Supabase Auth (browser + server)
└──────┬───────────────┬───────┘
       │ Supabase JS   │ REST (Bearer: Supabase JWT)
       │ (auth only)   │
┌──────▼──────┐  ┌─────▼────────────────────────┐
│  Supabase   │  │  FastAPI (Railway)           │
│  - Auth     │◄─┤  apps/api                    │
│  - Postgres │  │  - Verifies Supabase JWT     │
│  - Storage  │  │  - Repository pattern        │
│  - RLS      │  │  - AI Provider Manager       │
└─────────────┘  └─────┬────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
   ┌────▼───┐    ┌─────▼────┐   ┌─────▼────┐
   │ OpenAI │    │  Gemini  │   │  Claude  │
   └────────┘    └──────────┘   └──────────┘
```

### Responsibility split (strict)

| Concern                        | Owner                                   |
| ------------------------------ | --------------------------------------- |
| Authentication (sessions, OAuth, email verification, password reset) | Supabase Auth |
| Authorization (row ownership)  | RLS (defense-in-depth) + FastAPI repositories (primary) |
| All business logic & AI calls  | FastAPI                                 |
| All reads/writes to Postgres   | FastAPI via repositories (service role) |
| File storage (exports, avatars)| Supabase Storage                        |
| UI, routing, optimistic state  | Next.js                                 |

The frontend NEVER talks to Postgres tables directly. It uses Supabase JS
**only** for auth (sign-in, sign-up, OAuth, session refresh) and for
downloading files from Storage via signed URLs issued by the API.
All data flows through FastAPI. This keeps business rules (credit metering,
AI orchestration, validation) in exactly one place.

---

## 2. Monorepo Layout

```
podmind/
├── apps/
│   ├── web/                  # Next.js 15 (Module 5–6)
│   └── api/                  # FastAPI (Module 2–4)
├── supabase/
│   ├── migrations/           # SQL migrations — THIS MODULE
│   └── config.toml           # supabase CLI config (added in Module 2)
├── docs/
│   └── ARCHITECTURE.md
├── .github/workflows/        # CI (added in Module 7)
└── README.md
```

---

## 3. Database Design Principles

1. **UUID primary keys** — `gen_random_uuid()`, safe for public exposure,
   no enumeration attacks, merge-friendly across environments.
2. **Soft state, hard audit** — mutable business state lives on rows
   (`profiles.ai_credits`); the immutable truth lives in ledgers
   (`credit_transactions`, `activity_log`). Balances are derived by trigger,
   never trusted from the client.
3. **JSONB for AI output, columns for everything queryable** —
   the Research Agent returns a rich document (summary, key points, timeline,
   myths, angles…). Its *shape will evolve* with prompts and providers, so it
   is stored as validated JSONB (`research_items.content`) with a
   `content_version` for forward migrations. Everything we filter/sort/search
   on (topic, status, favorite, folder, tags) is a real column with an index.
4. **RLS on every table** — even though FastAPI uses the service role, RLS is
   enabled and enforced so that (a) a leaked anon key exposes nothing, and
   (b) we can later move read paths to PostgREST without a security rewrite.
5. **Search built-in** — `pg_trgm` for fuzzy ILIKE on project/topic names,
   generated `tsvector` columns for full-text search over research content.
6. **Everything timestamped** — `created_at` / `updated_at` (trigger-managed),
   soft delete via `deleted_at` on projects (30-day recovery window).

### Entity-Relationship Overview

```
auth.users 1──1 profiles
profiles   1──n ai_provider_configs        (per-provider settings, BYOK optional)
profiles   1──n projects
profiles   1──n folders                    (library organization, 1 level: folder→items)
profiles   1──n tags
projects   1──n research_items ── n──n tags (via research_item_tags)
folders    1──n research_items             (nullable: item may be unfiled)
research_items 1──n notes                  (highlight/bookmark/note/comment)
projects   1──n chat_sessions 1──n chat_messages
profiles   1──n topic_analyses             (Topic Finder results, cached & reusable)
profiles   1──n credit_transactions        (append-only ledger)
profiles   1──n activity_log               (append-only)
```

### Credit system

- New users receive a signup grant (default **100 credits**) via the
  `handle_new_user` trigger → written to the ledger → trigger updates balance.
- The API spends credits with `consume_credits(user_id, amount, reason, ref)`:
  a single SQL function that takes a **row lock**, checks the balance, writes
  the ledger entry, and updates the cached balance atomically. Concurrent
  requests cannot double-spend. A `CHECK (ai_credits >= 0)` is the last line
  of defense.

### Why chat context works

`chat_sessions.project_id` binds a chat to a project. When the Research Chat
answers, the API loads the project's completed `research_items.content` and
recent `chat_messages` into the prompt. Token counts are stored per message
so context-window trimming is deterministic.

---

## 4. API Conventions (enforced from Module 2 onward)

- Base path `/api/v1`, JSON only, snake_case payloads.
- Every request authenticated via `Authorization: Bearer <supabase JWT>`;
  FastAPI verifies signature against the project JWKS and extracts `sub`.
- Errors: RFC-7807-style problem JSON `{ "error": { "code", "message", "details" } }`.
- Pagination: cursor-based (`?cursor=&limit=`) on all list endpoints.
- Idempotency: AI generation endpoints accept `Idempotency-Key` headers.
- Logging: structured JSON (structlog), request-id propagation.

## 5. Frontend Conventions (enforced from Module 5 onward)

- Next.js 15 App Router, React Server Components by default; client
  components only where interactivity requires it.
- Shadcn UI + Tailwind design tokens; dark mode via `class` strategy,
  glassmorphism utilities defined once in the theme layer.
- Data layer: typed API client (`lib/api/`) generated against FastAPI's
  OpenAPI schema + TanStack Query for caching/optimistic updates.
- Framer Motion for page/element transitions; skeletons and empty states
  are first-class components, not afterthoughts.

## 6. Environments & Secrets

| Secret                    | Lives in            | Used by |
| ------------------------- | ------------------- | ------- |
| `SUPABASE_URL`, anon key  | Vercel + Railway    | web (auth), api (JWKS) |
| `SUPABASE_SERVICE_ROLE`   | Railway only        | api repositories |
| `OPENAI_API_KEY` etc.     | Railway only        | AI Provider Manager |
| `ENCRYPTION_KEY` (Fernet) | Railway only        | encrypting user BYOK keys at rest |

User-provided provider keys (BYOK) are encrypted **application-side** before
insert; the database only ever stores ciphertext (`ai_provider_configs.api_key_ciphertext`).
