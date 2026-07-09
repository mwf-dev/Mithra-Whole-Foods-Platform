# CI/CD

Two GitHub Actions workflows guard and ship this monorepo.

| Workflow | File | Trigger | Does |
|---|---|---|---|
| **CI** | `ci.yml` | every PR + push to `main` | lint/typecheck the storefront, build + test the backend |
| **Deploy Backend** | `deploy-backend.yml` | CI succeeds on `main` (or manual) | redeploys the backend on Koyeb |

Frontend deploys are handled by **Vercel's native Git integration** (no workflow) — see below.

```
PR ──► CI (web + backend jobs) ──► merge to main
                                        │
                                        ├─► CI re-runs on main ─► Deploy Backend ─► Koyeb
                                        └─► Vercel builds & deploys apps/web
```

## CI (`ci.yml`)

**`web` job** — `pnpm --filter web lint` + `tsc --noEmit`.
A full `next build` is deliberately **not** run in CI: the Medusa storefront
statically generates product/category pages against a *live* backend, which CI
doesn't have. Vercel runs the real build against the live backend on deploy.

**`backend` job** — spins up a `postgres:16` service, then:
1. `medusa build` — the compile gate (the exact command Koyeb runs).
2. `test:unit` — fast, no DB.
3. `test:integration:http` / `test:integration:modules` — boot a real Medusa app
   against the CI Postgres (`@medusajs/test-utils` migrates its own temp DB).

Key env (set in the workflow, not secrets): `NODE_ENV=test` (skips the production
secret/CORS boot guards in `medusa-config.ts`), `DATABASE_SSL=false` (CI Postgres
has no TLS; production/Neon keeps SSL on by default), and dummy
`JWT_SECRET`/`COOKIE_SECRET`/CORS values.

> **Known gap:** `medusa lint` is broken in this Medusa version (the repo ships an
> ESLint 9 flat config `eslint.config.ts` but Medusa bundles ESLint 8, which can't
> read it → `eslint.findConfigFile is not a function`). Backend lint is therefore
> omitted from CI; `medusa build` (swc compile) is the type/compile gate for now.
> Fix later by aligning ESLint versions, then add a `lint` step to the backend job.

## Deploy Backend → Koyeb (`deploy-backend.yml`)

Runs only when **CI concluded `success`** on `main` (or via manual
`workflow_dispatch`). It installs the Koyeb CLI and calls
`koyeb services redeploy`, which makes Koyeb pull the latest `main` and rebuild
from `apps/backend/Dockerfile`.

**Required repo settings** (Settings → Secrets and variables → Actions):

| Kind | Name | Value |
|---|---|---|
| Secret | `KOYEB_TOKEN` | a Koyeb API token |
| Variable | `KOYEB_APP` | Koyeb app name (e.g. `mithra`) |
| Variable | `KOYEB_SERVICE` | service name (e.g. `backend`) |

**Runtime env to set on the Koyeb service** (names from
`apps/backend/.env.template` — never commit values): `NODE_ENV=production`,
`DATABASE_URL` (Neon pooled), `JWT_SECRET`, `COOKIE_SECRET`,
`STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` (include the Vercel prod + preview URLs and
the backend's own URL), `STOREFRONT_URL`, `REVALIDATE_SECRET`, and the `S3_*`
(or `CLOUDINARY_*`) file-storage vars. Leave `DATABASE_SSL` unset (SSL on).

**Two operational must-dos:**
- **Disable Koyeb's own "auto-deploy on push"** for this service, so deploys are
  always gated on CI here (otherwise Koyeb deploys twice, one of them ungated).
- **Migrations:** run `medusa db:migrate` on each deploy of a new image. Koyeb has
  no separate pre-deploy job, so either set the service **run/start command** to
  `npx medusa db:migrate && npx medusa start` (fine while `max-instances=1`;
  migrations are idempotent), or run migrate manually before promoting. The
  **seed is NOT idempotent** — run it once per fresh DB only, never automatically.

## Deploy Frontend → Vercel (native, no workflow)

Use **Vercel → Add New Project → import this repo**:
- **Root Directory:** `apps/web`
- **Production Branch:** `main` (automatic PR previews for every branch)
- **Env (Production + Preview):** `MEDUSA_BACKEND_URL` (the Koyeb URL, server-side
  — *not* `NEXT_PUBLIC_`), `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_BASE_URL`, `REVALIDATE_SECRET` (same
  value as the backend), plus any Stripe keys once payments land.

Vercel auto-deploys on every push. To gate production on CI too, set Vercel's
**Ignored Build Step** to only build when the commit is on `main` and CI is green,
or promote previews manually. Deploy the backend first (the build fetches from it).

## Running the checks locally

```bash
# Storefront
pnpm --filter web lint
pnpm --filter web run typecheck

# Backend — build + unit tests (no DB needed)
pnpm --filter @dtc/backend build
pnpm --filter @dtc/backend test:unit

# Backend — integration tests need a local non-SSL Postgres:
#   docker run -d --name medusa-pg -e POSTGRES_PASSWORD=postgres \
#     -e POSTGRES_DB=medusa-test -p 5432:5432 postgres:16-alpine
export NODE_ENV=test DATABASE_SSL=false \
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/medusa-test
pnpm --filter @dtc/backend test:integration:http
```
