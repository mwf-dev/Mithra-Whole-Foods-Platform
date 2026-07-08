# Deployment — Vercel (web) + GCP Cloud Run (backend)

Verified against the code 2026-07-09. Env var names must match
`apps/backend/.env.template` and `apps/web/.env.template` exactly.

## 0. One-time prerequisites

- [ ] **Rotate the Neon database credential** (the old one is in git history
      on GitHub) and use the **pooled** connection string in production.
- [ ] Generate strong secrets: `openssl rand -base64 48` for `JWT_SECRET`,
      `COOKIE_SECRET`; `openssl rand -base64 32` for `REVALIDATE_SECRET`
      (same value on both apps). Store in GCP Secret Manager / Vercel env.
- [ ] Create a GCS bucket for uploads with S3-interop HMAC keys
      (Settings → Interoperability), or an S3 bucket. Uploads on Cloud Run
      are lost without this (`S3_*` vars in the backend template).

## 1. Backend → Cloud Run

Build from repo root (workspace context):

```bash
docker build -f apps/backend/Dockerfile \
  --build-arg STOREFRONT_URL=https://<your-vercel-domain> \
  -t <region>-docker.pkg.dev/<project>/<repo>/mithra-backend:$(git rev-parse --short HEAD) .
docker push <same-tag>
```

**Migration job (before every deploy of a new image):** Cloud Run Job, same
image, command `npx medusa db:migrate`, same env/secrets.

**Seed (once per fresh database only):** Cloud Run Job, command
`npx medusa exec ./src/migration-scripts/initial-data-seed.ts`. The seed
self-guards: it aborts if it finds already-seeded data.

**Service settings:**
- Port: Cloud Run injects `PORT` (Medusa honors it). Health probe: `GET /health`.
- `min-instances=1` (cold starts are heavy), **`max-instances=1` until Redis
  (Memorystore) is wired** — cache/event-bus are in-memory per instance.
  When scaling out: set `REDIS_URL`, and optionally split a worker service
  (`MEDUSA_WORKER_MODE=worker`, `DISABLE_MEDUSA_ADMIN=true`) from the API
  service (`MEDUSA_WORKER_MODE=server`).
- Env: `NODE_ENV=production`, `DATABASE_URL` (pooled), `JWT_SECRET`,
  `COOKIE_SECRET`, `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` (must include the
  Vercel prod + preview URLs and the backend's own URL for admin),
  `STOREFRONT_URL`, `REVALIDATE_SECRET`, `S3_*` vars.
  Missing secrets/CORS are **fatal at boot** by design.

## 2. Web → Vercel

- Root Directory: `apps/web`. Install command: default (pnpm, detected from
  the lockfile). Build: `next build`.
- Env (Production **and** Preview):
  - `MEDUSA_BACKEND_URL=https://<cloud-run-url>` (server-side; NOT `NEXT_PUBLIC_`)
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
4. Upload a hero image in admin → URL must point at the bucket, not
   `/static` (proves S3/GCS file module).
5. Full order: add to cart → checkout → COD → order confirmation, then the
   order appears in admin.
6. `POST https://<storefront>/api/revalidate` without the secret header → 401.

## Known limitations at launch

- **Payments = Cash on Delivery only** (`pp_system_default`). Online
  payments need a Razorpay/Stripe provider integration — do NOT enable
  card/UPI copy anywhere until that lands.
- Existing `hero_image_url`/product image rows in the database may point at
  `http://localhost:9000/...` — re-upload them via admin after the file
  module is live, or fix the rows.
- No rate limiting at the app layer — front Cloud Run with Cloud Armor or
  an API gateway if abuse becomes a concern.
