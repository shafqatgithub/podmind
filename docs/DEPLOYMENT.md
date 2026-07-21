# Deployment

PodMind runs as two independently deployed pieces:

| Piece | Platform | Entry point |
| --- | --- | --- |
| `apps/web` (Next.js) | Vercel | Root Directory `apps/web` |
| `apps/api` (NestJS) | Railway | `railway.json` at the repository root |

---

## Railway — the API

`railway.json` drives the build and start:

```jsonc
{
  "build": {
    "builder": "NIXPACKS",
    // --prod=false is required: Railway sets NODE_ENV=production, under which
    // pnpm omits devDependencies — and the Nest CLI that compiles the API is one.
    "buildCommand": "pnpm install --frozen-lockfile --prod=false && pnpm turbo run build --filter=@podmind/api... && ls -la apps/api/dist/main.js"
  },
  "deploy": {
    "startCommand": "node apps/api/dist/main.js",
    "healthcheckPath": "/api/v1/health"
  }
}
```

### Required variables

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Supabase **Session pooler** string | Not the Direct connection (IPv6-only). Include the database password. |
| `DB_SSL` | `true` | Required by Supabase. |
| `SUPABASE_URL` | `https://<ref>.supabase.co` | Used to fetch the JWKS that verifies user tokens. |
| `CORS_ORIGINS` | `https://podmind-web.vercel.app` | Comma-separated for multiple origins. |
| `NODE_ENV` | `production` | |

Optional — at least one is needed for AI features. The Router skips providers
without a key and falls back to the next candidate:

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`

**Do not set `PORT`.** Railway injects it and routes the public domain to it;
setting it by hand causes a port mismatch and the healthcheck fails.

### Verifying a deploy

```bash
curl https://<domain>/api/v1/health          # {"success":true,...}
curl https://<domain>/api/v1/health/ready    # database: up
curl https://<domain>/api/v1/research        # UNAUTHORIZED (route exists, token required)
```

A `NOT_FOUND` on the third call means an **older build is still running**.

### Pitfalls hit during setup

- **One service per app.** Creating a second service from the same repo
  produces a duplicate that builds the API without any variables and
  crash-loops on `DATABASE_URL: Required`. Delete the duplicate.
- **"Redeploy" replays the same commit.** To ship new code, push a commit or
  use Deploy on the latest commit — redeploying an old deployment rebuilds
  that old code, which looks like the fix silently not working.
- **Changing a variable redeploys the last *successful* build, not the latest
  commit.** If a build failed, every subsequent variable change quietly ships
  the older working image again. New routes appear to 404 long after the fix
  was pushed. Confirm the commit hash on the active deployment before
  concluding that code is broken.
- **Rotating the database password breaks the running service.** The API keeps
  serving `/health` (liveness has no dependencies) while `/health/ready`
  reports the database down and every data route returns 500. Update
  `DATABASE_URL` and redeploy.
- **Install once.** Nixpacks runs its own install phase; a second install in
  the build command with different flags makes pnpm wipe `node_modules` and
  prompt, which fails non-interactively with `Command "turbo" not found`. See
  `nixpacks.toml`.
- **Service names are cosmetic.** A service called `@podmind/web` can be
  running the API; what matters is the start command in `railway.json`.

---

## Vercel — the web app

Root Directory `apps/web`. Environment variables:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key |
| `NEXT_PUBLIC_SITE_URL` | `https://podmind-web.vercel.app` |
| `NEXT_PUBLIC_API_URL` | the Railway domain |

`NEXT_PUBLIC_*` values are baked in at build time, so changing one requires a
redeploy before it takes effect.

---

## Supabase

Auth → URL Configuration:

- **Site URL**: `https://podmind-web.vercel.app`
- **Redirect URLs**: `https://podmind-web.vercel.app/**`

Without these, verification and password-reset emails link to `localhost`.
