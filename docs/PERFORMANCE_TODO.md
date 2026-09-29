# Performance & Hardening — tracker

Living checklist for the storefront performance push and the deferred
infra/security items. Owner-facing; update the Status column as things land.

Last updated: 2026-07-13.

## Done (this branch: `perf/frontend-optimistic-ui`)

| # | Item | Notes |
|---|---|---|
| ✅ | Optimistic cart | `lib/context/cart-context.tsx` (React 19 `useOptimistic`). Nav badge, dropdown, product-card + PDP add-to-cart, cart-page quantity/delete all update in ms; server reconciles or rolls back + surfaces an error. |
| ✅ | Product-card images via `next/image` | Was a CSS `background-image` (no optimization). Now AVIF/WebP + responsive srcset + lazy-load. `next.config` gains `formats`, `qualities`, `minimumCacheTTL`. |
| ✅ | CI/CD: `dev` as active deploy branch | `ci.yml` builds (no tests) on `dev`; full pipeline on PRs/`staging`/`main`. Dashboard steps in `.github/workflows/README.md`. |

## Deferred — explicitly tracked (not done yet)

### 1. Redis (durable events + horizontal scale) — DEFERRED by owner
- **Why it matters:** Without `REDIS_URL`, Medusa uses the in-memory event bus →
  `order.placed` / `shipment-created` emails are lost if the backend restarts
  mid-processing, and only ONE backend instance can run (no scaling).
- **Action when ready:** provision a fresh **Upstash** instance, use a
  `rediss://` (TLS) URL with a **rotated** password (the previous one was
  exposed — see item 3), set `REDIS_URL` on Railway. `medusa-config.ts` already
  wires `cache-redis` + `event-bus-redis` + `workflow-engine-redis` when
  `REDIS_URL && !IS_DEV`.
- **Watch out:** the earlier boot hang was a corrupted `REDIS_URL` — validate the
  URL locally before setting it in Railway.

### 2. Stripe webhook — verify signature + rotate secret — DEFERRED by owner
- Confirm `STRIPE_WEBHOOK_SECRET` is set and signature verification is enforced
  on `/hooks/payment/stripe_stripe` so order/payment state can't be forged.
- Rotate the webhook signing secret and the Stripe API key when moving from the
  current test keys toward live.
- Keep `docs/STRIPE_SETUP.md` in sync.

### 3. Rotate & untrack leaked secrets — HIGH, security
- `apps/backend/get_key.js`, `test-db.js`, `test-env.js`, and tracked `.env.*`
  (both apps) contain real credentials in git history (see `BACKEND_PLAN.md`
  "Critical").
- **Action:** rotate `JWT_SECRET`, `COOKIE_SECRET`, `DATABASE_URL`, Stripe keys,
  Cloudinary/S3 keys, SendGrid key, Redis password; `git rm --cached` the files;
  add to `.gitignore`; scrub history if feasible.

## Backlog — perf/robustness (not started)

| Item | Where | Note |
|---|---|---|
| ⏳ Warm the backend / kill cold starts | `.github/workflows/keep-warm.yml` (added) | Scheduled `/health` ping — **inert until you set the `BACKEND_HEALTHCHECK_URL` repo secret**. Stopgap; the robust fix is Railway "min instances = 1" + region colocation. |
| Colocate backend near users (India) | Railway region | Cuts per-request RTT to Vercel/browser. |
| `listProductsWithSort` over-fetch | `apps/web/src/lib/data/products.ts` | Fetches 100 products to sort in memory, then slices 12. Move sort/paginate server-side as the catalog grows. |
| Surface errors in web data helpers | `apps/web/src/lib/data/*` | Several helpers swallow errors → `null`/`[]` (FRONTEND_PLAN Module 1). |
| Region map cache on serverless | `apps/web/src/lib/data/regions.ts` | Module-level `Map` is per-lambda; evaporates on cold start. |
