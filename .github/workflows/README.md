# CI/CD & Deployments

This repository uses GitHub Actions for CI and platform-native Git integrations
(Railway for the backend, Vercel for the storefront) for CD.

## Branch model

| Branch | Role today | CI on push | Deploys to |
|---|---|---|---|
| `dev` | **Active deploy branch** — treated as production for now | lint + typecheck + backend **build** (tests skipped for a fast loop) | Railway + Vercel |
| `staging` | Pre-production (reserved for the production-grade rollout) | full pipeline incl. tests | Railway + Vercel (staging env) |
| `main` | Production-grade target (reserved) | full pipeline incl. tests | Railway + Vercel (prod env) |

Pull requests always run the **full** pipeline (tests included), whatever the
target branch.

## Continuous Integration (`ci.yml`)

Runs on every PR and on pushes to `main`, `staging`, `dev`.
- **Web job**: `next lint` + `tsc --noEmit`. A full `next build` is intentionally
  NOT run in CI — the Medusa starter statically generates product/category pages
  against a LIVE backend, which CI has none of. Vercel owns the real web build.
- **Backend job**: `medusa build` (the compile gate — the same command the
  Railway Docker build runs), then unit + integration tests. **Tests are skipped
  on direct pushes to `dev`** (`if: github.ref != 'refs/heads/dev'`) so the
  deploy loop stays fast; the build step still gates every push.

## Continuous Deployment

We use platform-native Git integrations, so no deploy secrets live in GitHub.

### Point the platforms at `dev` (one-time dashboard changes)

"Which branch deploys" is a platform setting, not a repo file, so make `dev`
the live branch in each dashboard:

**Railway (backend)**
1. Service → **Settings → Source** → set the deployment branch to `dev`.
2. Enable **"Wait for CI"** (Settings → Deploy) so Railway only deploys a
   commit after this workflow passes on `dev`.
3. **Deploy → Custom Start Command**: run migrations first —
   `npx medusa db:migrate && npm run start`.
4. Variables: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `REVALIDATE_SECRET`,
   `CLOUDINARY_*` / `S3_*`, `SENDGRID_*`, CORS vars, and (when re-enabled)
   `REDIS_URL`. See [`/docs/PERFORMANCE_TODO.md`](../../docs/PERFORMANCE_TODO.md).

**Vercel (storefront)**
1. Project → **Settings → Git → Production Branch** → set to `dev`.
2. Root Directory = `apps/web`.
3. Env vars for Production **and** Preview: `NEXT_PUBLIC_MEDUSA_BACKEND_URL`
   (→ the Railway backend domain), `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`,
   `NEXT_PUBLIC_STRIPE_KEY`.
4. Vercel respects the branch's CI status before promoting.

### Promoting to staging / main later

When you move to the production-grade setup, create separate Railway/Vercel
environments watching `staging` and `main`. CI already runs the full pipeline
(tests included) on both, so no workflow change is needed — only new platform
environments with their own env vars/domains.

## Pull Requests

CI blocks merging if lint, types, build, or tests fail. Run `pnpm --filter
@dtc/backend build` (and `test`) plus `pnpm --filter medusa-next lint` locally
before pushing.
