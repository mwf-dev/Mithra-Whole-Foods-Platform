# Deployment — Vercel (web) + Railway (backend)

Verified against the code 2026-07-09. Env var names must match
`apps/backend/.env.template` and `apps/web/.env.template` exactly.

> **Backend deploys to Railway.** The CI/CD pipeline
> (`.github/workflows/`, documented in `.github/workflows/README.md`) builds and
> tests on every PR. Deployments occur through Railway and Vercel's native Git integrations
> which will automatically wait for the CI checks on `main` to pass.

## 0. One-time prerequisites

- [ ] **Rotate the Neon database credential** (the old one is in git history
      on GitHub) and use the **pooled** connection string in production.
- [ ] Generate strong secrets: `openssl rand -base64 48` for `JWT_SECRET`,
      `COOKIE_SECRET`; `openssl rand -base64 32` for `REVALIDATE_SECRET`
      (same value on both apps). Store in Railway / Vercel env.
- [ ] Ensure you have Cloudinary and SendGrid API keys configured.

## 1. Backend → Railway

The repository includes a `railway.json` file in the root directory that automatically directs Railway to build the `apps/backend/Dockerfile` and sets the `/health` check.

**Setup Instructions:**
1. Connect your repository to Railway as a new project. Do **not** set a
   Root Directory — the Dockerfile needs the repo root as build context
   (`railway.json` already points at `apps/backend/Dockerfile`).
2. In the Railway Service Settings, enable **"Wait for CI"**.
3. **Migrations run automatically** via the `preDeployCommand` in
   `railway.json` (`npm run db:migrate:prod`), which executes before each
   new deploy is promoted. Set `DATABASE_URL_DIRECT` to the Neon **direct**
   (non-pooled) connection string — migrations must not go through
   PgBouncer transaction pooling; runtime keeps using the pooled
   `DATABASE_URL`. If `DATABASE_URL_DIRECT` is unset, the script falls
   back to `DATABASE_URL`. Do NOT set a Custom Start Command.
4. **Seed (once per fresh database only):** You can use Railway's CLI or dashboard console to run:
   `npx medusa exec ./src/migration-scripts/initial-data-seed.ts`. The seed
   self-guards: it aborts if it finds already-seeded data.

**Service settings:**
- Port: Railway injects `PORT` (Medusa honors it). Health probe: `GET /health` (set in `railway.json`).
- **`max-instances=1` until Redis is wired** — cache/event-bus are in-memory per instance.
  When scaling out: set `REDIS_URL` to a Redis service instance.
- Env: `NODE_ENV=production`, `DATABASE_URL` (pooled), `DATABASE_URL_DIRECT`
  (Neon direct, for migrations), `JWT_SECRET`,
  `COOKIE_SECRET`, `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` (must include the
  Vercel prod + preview URLs and the backend's own URL for admin),
  `STOREFRONT_URL`, `REVALIDATE_SECRET`, `CLOUDINARY_*`, `SENDGRID_*`.
  Missing secrets/CORS are **fatal at boot** by design.

## 2. Web → Vercel

- Root Directory: `apps/web`. Install command: default (pnpm, detected from
  the lockfile). Build: `next build`.
- Env (Production **and** Preview):
  - `MEDUSA_BACKEND_URL=https://<your-railway-url>` (server-side; NOT `NEXT_PUBLIC_`)
  - `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...` (from Medusa admin)
  - `NEXT_PUBLIC_DEFAULT_REGION=in`
  - `NEXT_PUBLIC_BASE_URL=https://<your-domain>`
  - `REVALIDATE_SECRET` (same value as backend)
- The build statically generates product/category pages against the live
  backend — deploy the backend first.

## 3. Post-deploy smoke test

1. `GET https://<backend>/health` → 200.
2. Storefront homepage renders with hero + products (no blank page).
3. Admin (`https://<backend>/app`) → Homepage settings → save → storefront
   homepage updates (proves STOREFRONT_URL + REVALIDATE_SECRET wiring).
4. Upload a hero image in admin → URL must point at Cloudinary, not
   `/static`.
5. Full order: add to cart → checkout → COD → order confirmation, then the
   order appears in admin.
6. `POST https://<storefront>/api/revalidate` without the secret header → 401.

## Known limitations at launch

- **Payments = Cash on Delivery only** (`pp_system_default`). Online
  payments need a Razorpay/Stripe provider integration — do NOT enable
  card/UPI copy anywhere until that lands.
- Rate limiting is wired in Express and configured for proxy resolution via `X-Forwarded-For`.
