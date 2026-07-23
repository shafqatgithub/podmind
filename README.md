# PodMind AI

> **Research Less. Create More.** — the AI operating system for podcasters.

Give it a topic; get back an episode package: research, guest briefing, outline,
script, fact check, SEO and social posts — with sources, credit metering and
provider fallback throughout.

**Live:** [podmind-web.vercel.app](https://podmind-web.vercel.app)

---

## Stack

| Layer | Technology | Hosting |
| ----- | ---------- | ------- |
| Frontend | Next.js 15 (App Router), Tailwind, Framer Motion | Vercel |
| Backend | NestJS 11, TypeScript | Railway |
| Database | Supabase Postgres 17 + pgvector | Supabase |
| Auth | Supabase Auth (JWT, JWKS verified) | — |
| Payments | Paddle Billing (merchant of record) | — |
| Monorepo | pnpm workspaces + Turborepo | — |

## What is built

All 20 documented product modules ship with a backend, a screen and tests.

**Create** — Episode Pipeline (orchestrator), Research, Outlines, Scripts, Guest
Intelligence
**Refine** — Fact Checker, SEO Engine, Social Posts, Export Center
**Context** — Knowledge Hub (pgvector RAG), AI Memory, AI Chat
**Operate** — Dashboard, Analytics, Billing, API Keys, Notifications, Settings,
Admin Panel

Roughly 96 REST routes under `/api/v1`, 199 database tables, 316 tests across 23
suites.

## Repository layout

```
apps/
  api/        NestJS backend  — one module per feature, each tenant-scoped
  web/        Next.js frontend — one workspace component per feature
packages/
  config/     Shared TypeScript, ESLint and Prettier presets
  types/      Generated database types + API envelope types
  ui/         Design tokens and primitives (brand system lives here)
docs/         Numbered specifications — the source of truth for every module
  database/   Ordered .sql migrations (41 files)
supabase/
  deploy/     Compacted migration batches for applying to the live project
  tests/      Schema smoke tests + a local Supabase shim
```

## Conventions that matter

**The docs are the source of truth.** `docs/` holds numbered specifications;
modules conform to them rather than the other way round. Where a specification
and the live schema disagreed, the fix went into `docs/database/` and was then
applied to the live project — never patched around in application code.

**Every module is tenant-scoped.** Repositories reach their rows through
`project → workspace → organization`. An id forged from another tenant matches
no row rather than being caught by a permission check afterwards.

**One envelope.** Every response is
`{ success, data, error, request_id, timestamp, version }`, applied globally by
an interceptor. Errors carry machine-readable UPPER_SNAKE codes so clients can
branch on `INSUFFICIENT_CREDITS` without matching strings.

**The boot contract test.** `apps/api/test/boot.e2e.spec.ts` boots the real
application and asserts the exact route table. A module that is written but
never registered is silently absent at runtime — this test is what catches that,
so every new feature module adds its routes there.

**AI goes through the Router.** No module calls a provider directly. The Router
(`apps/api/src/ai/`) owns model selection per task, retries, fallback across
providers, credit metering and telemetry into `ai_requests`.

## Getting started

Requires Node 20–24 and pnpm 9.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # Supabase + API URL
cp apps/api/.env.example apps/api/.env         # database + provider keys
pnpm dev
```

Full pipeline — build, typecheck and test across every package:

```bash
pnpm turbo run build typecheck test
```

Tests run against a real Postgres with the documented schema applied, not
mocks, so a query that would fail in production fails here first. See
`supabase/tests/` for the local setup.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the Railway, Vercel and
Supabase specifics, including the traps that cost real time — Railway watch
paths silently skipping commits, and variable changes redeploying the last
successful build rather than the latest one.
