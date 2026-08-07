# apps/backend — Medusa v2 backend (`@dtc/backend`)

Medusa 2.17 server: built-in commerce APIs + one custom module (`homepage`
CMS) + a custom admin page with live storefront preview. Serves storefront API
on :9000 and admin UI at :9000/app. Root rules in [/CLAUDE.md](../../CLAUDE.md);
endpoint shapes in [/API_CONTRACTS.md](../../API_CONTRACTS.md).

## Load-bearing files

- `medusa-config.ts` — DB (Neon), CORS from env, secrets. ⚠️ **The three
  "known flaw" notes that used to be here are fixed and the claim that there
  are "No Redis/file/payment modules" is wrong.** Verified 2026-08-01: SSL uses
  `rejectUnauthorized: true`; unset/`supersecret` secrets and missing CORS
  **throw** outside development/test; and the `modules` array conditionally
  registers homepage, product-review, file (Cloudinary or S3), Redis
  cache/event-bus/workflow-engine (prod only), Stripe payment and SendGrid
  notification. **No fulfillment module is registered** — that one really is
  absent, so shipping falls back to `manual_manual`.
- `src/modules/homepage/` — `models/homepage.ts` (HomepageSetting),
  `service.ts` (`MedusaService({ HomepageSetting })` auto-CRUD:
  `listHomepageSettings`, `createHomepageSettings`, `updateHomepageSettings`),
  `index.ts` (module key `"homepage"`), `migrations/` (generated).
- `src/api/homepage/route.ts` — public GET (deliberately outside `/store`).
- `src/api/admin/homepage/route.ts` — GET + POST upsert (unvalidated body).
- `src/admin/routes/homepage/page.tsx` — CMS form; uploads via
  `POST /admin/uploads` (local `static/`); preview iframe hardcodes
  `http://localhost:3000`.
- `src/migration-scripts/initial-data-seed.ts` — the wired seed (`pnpm seed`):
  store/region(INR)/channel/key + 3 categories + `homepage-best-sellers`
  collection + 3 products.
- `src/subscribers/` — `catalog-changed.ts` (storefront cache revalidation +
  orphaned-cart cleanup + search-index invalidation), `order-placed.ts`
  (**authoritative `order_completed` analytics event**, then customer
  confirmation + admin alert email), `shipment-created.ts` (tracking email).
  Email subscribers no-op gracefully without SendGrid env vars.
  ⚠️ In `order-placed.ts` the analytics call must stay **before** the
  `Modules.NOTIFICATION` resolve — that resolve returns early whenever SendGrid
  is unconfigured, which is the current state, and moving analytics after it
  would silently take revenue reporting down with the emails.
- `src/lib/observability.ts` / `src/lib/analytics.ts` — Sentry + PostHog sinks.
  Both lazy-init and no-op without `SENTRY_DSN` / `POSTHOG_KEY`; neither ever
  throws into a commerce flow. See `/docs/OBSERVABILITY_SETUP.md`.
- Payments: Stripe via `@medusajs/payment-stripe` (env-gated on
  `STRIPE_API_KEY`, auto-capture, webhook `/hooks/payment/stripe_stripe`) —
  see `/docs/STRIPE_SETUP.md`. `pp_system_default` doubles as COD.
- `jobs/ links/ workflows/` — README-only placeholders.

## Commands

```bash
pnpm --filter @dtc/backend dev        # medusa develop, :9000
pnpm --filter @dtc/backend db:migrate # after any model change
pnpm --filter @dtc/backend seed       # ONCE per fresh DB only — see gotchas
npx medusa exec ./src/migration-scripts/<script>.ts   # from apps/backend/
npx medusa db:generate homepage       # regenerate migration after model edit
```

## Gotchas (verified 2026-07)

- **Seeds are NOT idempotent** — re-running duplicates store/region/collection
  (same handle → homepage best-sellers silently swaps). Never run on a
  non-empty DB. `seed-products.ts` is a divergent unwired duplicate
  (different images, oil `1L` vs `1kg`) — do not run alongside the main seed;
  slated for consolidation (BACKEND_PLAN Module 5).
- **Upsert (fixed 2026-07-08)**: `POST /admin/homepage` whitelists fields
  (no `id` injection), validates lengths/URLs, reads ordered `created_at ASC`
  and self-heals duplicate rows. GET and POST both return
  `{ homepage_settings }` (envelope normalized).
- ⚠️ **`src/api/middlewares.ts` does exist** (this line used to deny it).
  It holds the `/auth/*` and `/store/*` rate limiters plus `authenticate()`
  guards on review writes and invoice downloads. The store limiter is keyed by
  `storeRateLimitKey` (`src/utils/client-ip.ts`) — read that function's comment
  before touching it; plain IP keying makes the limit a site-wide ceiling
  because the storefront is server-rendered.
- Uploads land on local disk (`static/`) — ephemeral on Cloud Run until a
  GCS/S3 file module is added.
- `test:integration:*` scripts reference a missing `integration-tests/` dir;
  only `test:unit` can work (no tests written yet).
- `get_key.js`, `test-db.js`, `test-env.js`, tracked `.env.*`: leaked-secret
  cleanup pending (BACKEND_PLAN Critical). Don't copy their pattern.

## Common tasks

- **New endpoint** → `src/api/<scope>/<name>/route.ts` exporting
  `GET/POST(req: MedusaRequest, res: MedusaResponse)`; `/admin/*` auto-authed,
  `/store/*` needs publishable key. Then update `/API_CONTRACTS.md`.
- **Model change** → edit `src/modules/homepage/models/`, run
  `npx medusa db:generate homepage`, then `db:migrate`. Never hand-edit
  committed migrations.
- **New domain concept** → new module under `src/modules/<name>/` mirroring
  homepage's structure; register it in `medusa-config.ts`.

## When editing here, also check/update

- `/API_CONTRACTS.md` for any route/shape change
- `web/src/services/medusa.ts` + `admin/routes/homepage/page.tsx` (the two
  consumers of the homepage endpoints)
- Seed data that the frontend hardcodes: collection handle
  `homepage-best-sellers`, category names, `Weight` option
- `BACKEND_PLAN.md` — mark fixed items so the roadmap stays truthful
