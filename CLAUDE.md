# CLAUDE.md — Mithra Whole Foods (canonical agent instructions)

Single source of truth for AI agents. `AGENTS.md`, `AGENT.md`, and
`.agents/AGENTS.md` defer to this file. **Trust the code over any doc,
including this one** — verify before you assert. Everything below was checked
against the repo and the running backend on **2026-07-16**, and re-verified
against the repo + live Neon DB on **2026-08-01**.

## What this app is

Grocery & traditional-foods e-commerce: Next.js storefront + Medusa v2 backend,
plus a custom `homepage` CMS module and an admin live-preview page.

The full commerce path **exists and works**: catalog browsing, cart, customer
auth, checkout, Stripe payments, order confirmation, search, wishlist, and
account/order history. It is not a browse-only prototype.

- **Cart** — real, optimistic, in `apps/web/src/lib/context/cart-context.tsx`
  (`useCart()`; applies a local diff first, rolls back + toasts on backend
  reject). The nav badge is computed from line-item quantities in
  `modules/layout/components/cart-dropdown/index.tsx` — nothing is hardcoded.
- **Auth** — `lib/data/customer.ts` (`login`, `signup`, `signout`,
  `transferCart`, address CRUD).
- **Checkout** — `modules/checkout/` (addresses → shipping → payment → review).
- **Search** — in-house engine, no external service: `/store/search` →
  `apps/backend/src/lib/product-search.ts`, returns `{ product_ids }`.
  Meilisearch was removed in `e0e2847`; don't reintroduce it.

**Currency/region reality:** the live DB has exactly **one region — "USA",
`usd`**. The seed script (`initial-data-seed.ts`) still creates INR/`in,us,gb`
data, so it does **not** describe what is live. Older docs calling this app
"India-first, INR" are wrong about the current system.

## Tech stack (verified against installed node_modules, 2026-07-16)

- Monorepo: pnpm 9 workspaces (`apps/*`, `packages/*`) + Turborepo 2.
  `packages/` is **empty**.
- `apps/web` — package name is **`medusa-next`**, not `web`. This is the
  **Medusa Next.js starter**, not a bespoke app. Next **15.5.18** (App Router,
  Turbopack, dev on **:8000**), React **19.0.5**, TypeScript 5,
  **Tailwind CSS v3.4.19 with `tailwind.config.js`** (not v4),
  `@medusajs/ui` 4.1.19 + `@medusajs/icons`, `@medusajs/js-sdk` 2.17.2,
  `@stripe/react-stripe-js` 5.x, `@headlessui/react`, lucide-react.
- `apps/backend` (`@dtc/backend`) — Medusa **2.17.0**, PostgreSQL (Neon),
  Jest. Deps include `@medusajs/payment-stripe`,
  `@medusajs/notification-sendgrid`, `cloudinary`, `express-rate-limit`,
  `pdfkit` (invoices), `zod`.
- **Do not assume** zustand, react-query, react-hook-form, zod, framer-motion,
  or embla are available in `apps/web` — none are installed there. State is
  React context + `useState`. (`zod`/react-query exist in the **backend** only.)

## Infrastructure: what is actually wired

`medusa-config.ts` registers modules **conditionally on env vars**. Read it
before claiming anything is absent — the honest summary:

| Concern | Status |
|---|---|
| Stripe | **Active.** `STRIPE_API_KEY` set; `/store/payment-providers` returns `pp_stripe_stripe` + `pp_system_default` (the latter doubles as COD). Auto-capture on. |
| Cloudinary | **Active** for uploads (`CLOUDINARY_CLOUD_NAME` set) → `src/providers/file-cloudinary`. Falls back to local `static/` only when unset. An `S3_BUCKET` provider takes precedence if ever set. |
| Redis | **Set, but gated `REDIS_URL && !IS_DEV`.** In production: `cache-redis`, `event-bus-redis`, `workflow-engine-redis`. In **local dev it is deliberately off** — you get the in-memory versions. Both statements are true; don't flatten them. |
| SendGrid | **Not configured** — see gaps below. |
| Fulfillment / shipping | **No provider integrated.** `medusa-config.ts` never registers `@medusajs/medusa/fulfillment`, so Medusa falls back to `manual_manual`. Live DB (verified 2026-08-01): 1 region USA/usd, 1 stock location "Mithra Whole Foods — Exton", 1 fulfillment set still named **"European Warehouse delivery"**, one country-level zone `us`, two flat options (Standard/Express), **no `pickup` set**. Shipping is 100% manual. → `docs/SHIPPING_AUTOMATION_RESEARCH.md` |
| Analytics | **Implemented 2026-08-01**, inert until keys are set. PostHog commerce funnel (`src/lib/analytics/*`, typed catalogue in `events.ts`) + authoritative server-side `order_completed` from the backend `order-placed` subscriber. `@vercel/analytics` retained for Web Vitals. → `docs/OBSERVABILITY_SETUP.md` |
| Usage/cost metering | **Implemented 2026-08-06**, always on, zero-dependency. `src/lib/request-metrics.ts` + `GET /admin/usage` (admin-authed) + a 15-min `[usage]` log line. Reports RSS/CPU (what Railway bills) alongside request counts. Blind spot: requests rejected by Medusa's own publishable-key/admin-auth layer never reach it. → `docs/COST_AUDIT_2026-08-06.md` |
| Error tracking | **Implemented 2026-08-01**, inert without a DSN. Sentry on both apps (`instrumentation*.ts`, `sentry.*.config.ts`, `src/lib/observability/report.ts`; backend `src/lib/observability.ts`). All error boundaries report with `digest`. |
| Resilience | **Implemented 2026-08-01.** `src/lib/util/resilient-fetch.ts` wraps every Medusa call via `src/lib/config.ts`: retry + full-jitter backoff + 10s timeout, **reads replayed, writes not** (except 429). Storefront `GET /health` is a deep readiness probe. |

## Real remaining gaps (re-verified 2026-08-01)

- **`STRIPE_WEBHOOK_SECRET` is unset** → the Stripe module registers with
  `webhookSecret: undefined`, so webhook signatures at
  `/hooks/payment/stripe_stripe` are not verified. Payments work; async webhook
  confirmation should not be trusted until this is set. (The backend prints an
  explicit warning about this on every boot.)
- **`SENDGRID_API_KEY` is unset** → the notification module is never
  registered, so the `order-placed` / `shipment-created` subscribers **no-op
  silently**. Order emails do not send. Don't debug "missing emails" as a
  subscriber bug; it is a missing env var.
- **No fulfillment provider** — see the infrastructure table above.
- **Observability keys are unset.** The pipeline is built and wired but inert
  until `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`,
  `POSTHOG_KEY` and `STOREFRONT_PROXY_SECRET` are provided. See
  `docs/OBSERVABILITY_SETUP.md`. `STOREFRONT_PROXY_SECRET` is the highest-value
  one and costs nothing — it converts the `/store/*` limit from a site-wide
  ceiling into a genuine per-shopper limit.
- **`apps/web` now has a test framework — Vitest, added 2026-08-02, scoped to
  unit tests only** (no jsdom/component testing yet). Config:
  `apps/web/vitest.config.mts` (must be `.mts`, not `.ts` — the project isn't
  ESM by default and `vite-tsconfig-paths` is ESM-only; a plain `.ts` config
  fails to load). `pnpm --filter medusa-next test`, wired into CI's `web` job.
  First suite: `src/lib/util/resilient-fetch.test.ts`, 44 assertions covering
  the retry decision table, backoff/jitter, and the reporting filter.
- **The backend and the database are in different continents.** Measured
  2026-08-06: `/health` (no DB) 0.31s vs `/store/regions` (one 1-row table)
  0.62s → **~290ms for a single DB round trip** (same-region should be 1–3ms).
  Neon is `us-east-1`; `x-railway-edge` reports `sin1`. `/store/products` with
  `calculated_price` costs 2.25s ≈ 0.31s baseline + ~7 round trips. **This
  supersedes the "per-variant N+1 in price resolution" hypothesis in
  `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §9** — `limit=12` (2.25s) and
  `limit=100` (2.41s) are nearly flat, which an N+1 would not be. Fix is to
  co-locate the backend with the DB; expected 2.25s → ~0.35s with no code
  change. ⚠️ §9b's "don't change deployment topology" ruling was about the
  **Vercel↔Railway** hop and is still correct — Railway↔Neon is a different
  link and was never measured. See `docs/SPEED_BENCHMARK_2026-08-06.md`.
- **⚠️ Much of the 2026-08-01/02 optimization work is uncommitted** (44 modified
  + 88 untracked files as of 2026-08-06; every branch's last commit is
  2026-07-30). The live site does **not** have the Cloudinary image fix,
  `resilient-fetch`, the health probe or the observability pipeline. Before
  debugging "the optimizations didn't help", check whether they shipped.

## Frontend performance invariants (learned 2026-08-01)

Full analysis with `file:line` evidence in
`docs/AUDIT_2026-08-01_FRONTEND_PERF.md`. The rules that matter when touching
storefront code:

1. **`router.refresh()` is not a cache-invalidation tool.** It wipes the *entire*
   client Router Cache (killing every prefetch) **and** re-runs the `(main)`
   layout, which costs 4–5 backend calls. `cart-context.tsx:151` calls it after
   every cart mutation → **~6.5 `/store/*` requests per add-to-cart**. Never add
   another unconditional `router.refresh()`.
2. **The `/store/*` rate limit is a site-wide ceiling, not per-user** (150/min,
   IP-keyed, and SSR means every shopper shares the Next server's IP). Combined
   with (1) that is roughly **23 add-to-carts per minute for the whole site**.
   Treat every avoidable backend call as spending a shared budget.
3. **Every route is dynamic** because `(main)/layout.tsx` reads cookies via
   `retrieveCustomer()` / `retrieveCart()`. Consequences: `generateStaticParams`
   on the PDP is inert, and Next 15's `staleTimes.dynamic: 0` default means
   prefetched payloads are discarded before use (`next.config.js` sets no
   `experimental.staleTimes`).
4. **`router.push`/`replace` on a dynamic route is a full server round-trip.**
   The PDP fires one on mount (`product-actions/index.tsx:105`), so every
   single-variant product page renders twice. Checkout step changes and every
   sort/filter/paginate click are the same shape.
5. **`listProductsWithSort` fetches 100 products to render 12**
   (`lib/data/products.ts:115`) and paginates a 100-item window — so
   **pagination past product 100 silently returns empty pages.** Real bug,
   currently masked by a ~54-product catalog.
6. **`getCacheTag()` keys tags by `_medusa_cache_id`, a per-browser UUID**, while
   the Next Data Cache is keyed by URL. Tag invalidation is therefore unreliable
   for `products`/`categories`/`regions`/`customers`/`orders`. The cart already
   works around this by tagging with the cart id (`cookies.ts:47-63`) — follow
   that pattern, don't copy the broken one.
7. **Optimistic UI exists for the cart and nothing else.** Sort, filter,
   paginate, search and checkout steps have no pending state at all. If you add
   an interaction, give it feedback.
8. **Never swallow an error silently.** Fallbacks are fine — an empty grid beats
   a 500 — but every `catch` that returns `null`/`[]` must report first. Use
   `swallow(fallback, scope)` or `reportError` from
   `@lib/observability/report`. Equally: do **not** report expected 4xx (guest
   `401` on `customers/me`, `404` on a stale cart cookie) — noise makes the
   tracker unreadable. `isReportable()` in `resilient-fetch.ts` is the filter.
9. **Retries must stay asymmetric.** Reads are replayed; writes are not, except
   on 429 (rejected before the handler, so provably no state change). Relaxing
   that is how you get duplicate line items and double payment attempts.
10. **Instrumentation must never block or throw.** Analytics calls are
    fire-and-forget and swallow their own errors; server-side events use
    `after()`. Latency is the presenting complaint here — never add to it.

## Design system drift (2026-08-01)

`tailwind.config.js` defines `primary: #2E7D32` and `background/cream: #FAF7F1`,
but components hardcode a **different** green (`#2E5C31`, 44 occurrences) and
three near-miss creams. Two button systems coexist (`@medusajs/ui` `<Button>`
and raw Tailwind `<button>`) with different heights and radii, and
`font-playfair` is a legacy alias that actually renders DM Serif Display.
**Use the tokens; do not add new hex literals.** Reconciliation plan in
`docs/PRODUCTION_ROADMAP.md` §3.

## Repo map

| Path | Purpose |
|---|---|
| `apps/web/` | Storefront (Medusa Next.js starter layout — see below). No `apps/web/CLAUDE.md` exists. |
| `apps/backend/` | Medusa backend + admin → `apps/backend/CLAUDE.md` (⚠️ itself stale: it claims no Redis/file/payment modules and no `middlewares.ts`; both are wrong) |
| `packages/` | Empty placeholder |
| `docs/` | **Current (2026-08-06):** `COST_AUDIT_2026-08-06.md` (why Railway bills with no traffic — read before touching hosting or handing the project to the client), `LAUNCH_CHECKLIST.md` (prioritized pre-launch punch list), `AUDIT_2026-08-01_FRONTEND_PERF.md`, `SHIPPING_AUTOMATION_RESEARCH.md`, `PRODUCTION_ROADMAP.md`, `OBSERVABILITY_SETUP.md`. Older: `STRIPE_SETUP.md`, `ADMIN_ORDER_GUIDE.md`, `PERFORMANCE_TODO.md` |
| `API_CONTRACTS.md` | Endpoint shapes. Last touched 2026-07-10 — closest to current, still verify. |
| `CODEBASE_MAP.md`, `BACKEND_PLAN.md`, `FRONTEND_PLAN.md`, `AGENTS.md` | **Stale (2026-07-08), pre-date cart/auth/checkout/search.** Historical only. |
| `Mithra_*.md`, `PRODUCTION_AUDIT.md`, `QA_TEST_REPORT.md`, etc. | Aspirational/outdated |

### apps/web layout (starter conventions — there is **no `src/features/`**)

- `src/app/[countryCode]/(main|checkout)/...` — routes are country-scoped;
  `src/middleware.ts` resolves the region and redirects. Links must be
  localized or you cause a full page reload.
- `src/modules/<domain>/` — `account, cart, categories, checkout, collections,
  common, home, layout, order, products, search, shipping, skeletons, store`.
- `src/lib/data/*.ts` — **all backend calls live here** (`cart.ts`,
  `customer.ts`, `products.ts`, `orders.ts`, `search.ts`, …).
- `src/lib/config.ts` — the configured Medusa SDK client. There is **no
  `src/services/medusa.ts`**.

## Commands (verified to resolve)

```bash
pnpm install                              # repo root
pnpm dev                                  # turbo: web :8000 + backend :9000
pnpm build / pnpm lint / pnpm format
pnpm --filter medusa-next dev             # storefront only → :8000
pnpm --filter @dtc/backend dev            # backend :9000, admin at /app
pnpm --filter @dtc/backend db:migrate
pnpm --filter @dtc/backend test:unit      # real unit tests exist and run
pnpm --filter @dtc/backend test:integration:http
cd apps/backend && npx medusa exec ./<script>.ts    # one-off ops scripts
```

⚠️ **`pnpm --filter web` matches nothing** (the package is `medusa-next`); use
`medusa-next` or `./apps/web`. The storefront is on **:8000, not :3000**.
Backend unit tests and `integration-tests/` both exist now. **No web tests.**

## Environment variables (names only — never commit values)

Backend — see `apps/backend/.env.template` (authoritative, has placeholders):
`DATABASE_URL` (+ `DATABASE_URL_DIRECT` for prod migrations), `DATABASE_SSL`,
`JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`,
`REDIS_URL`, `MEDUSA_WORKER_MODE`, `CLOUDINARY_*`, `STRIPE_API_KEY`,
`STRIPE_WEBHOOK_SECRET`, `SENDGRID_*`, `ADMIN_NOTIFICATION_EMAIL`,
`STOREFRONT_URL`, `REVALIDATE_SECRET`, `DISABLE_MEDUSA_ADMIN`, `S3_*`.

Web: **`MEDUSA_BACKEND_URL`** (server-side, read by `src/lib/config.ts`;
**deliberately no longer `NEXT_PUBLIC_`-prefixed** — the middleware warns about
this rename), `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DEFAULT_REGION`,
`NEXT_PUBLIC_STRIPE_KEY`, `REVALIDATE_SECRET`.

Production guard: `medusa-config.ts` **throws** if `JWT_SECRET`/`COOKIE_SECRET`
are unset or `supersecret`, or if CORS vars are missing, whenever `NODE_ENV` is
not `development`/`test`.

⚠️ **Credential history**: `.env*` files are now correctly gitignored and only
`.env.template` is tracked — but `get_key.js`, `test-db.js`, `test-env.js`, and
real `.env.*` files **were committed historically and remain recoverable from
git history** (removed in `e8251b4`). Removal ≠ rotation: treat every secret
ever committed as compromised until rotated. Never add secrets to tracked
files; extend `.env.template` with placeholders.

## Deployment

- Backend → **Railway** (`railway.json`, `apps/backend/Dockerfile`), health
  probe `GET /health`, migrations via `db:migrate:prod` (uses the **direct**,
  non-pooled Neon URL — PgBouncer breaks DDL locks). Seed is **NOT idempotent**;
  one-off on an empty DB only.
- Frontend → **Vercel**, root `apps/web`. Backend CORS must include its URLs.
- CI: `.github/workflows/ci.yml`, `keep-warm.yml`.

## Do not touch

- Generated: `apps/web/.next/`, `apps/backend/.medusa/`, `.turbo/`, `node_modules/`
- `pnpm-lock.yaml` — only via pnpm commands
- `apps/backend/src/modules/homepage/migrations/*` — generated via
  `npx medusa db:generate homepage`; never hand-edit a committed migration
- `apps/backend/static/` — runtime upload storage, not source

## Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` with an
  optional scope — `feat(cart): add persistent guest cart`.
- Components `PascalCase.tsx` / starter-style `index.tsx` per component dir;
  hooks `useX.ts`; utils camelCase.
- Follow the **starter's** module layout above. The old `src/features/<name>/`
  + `MODULE.md` + `_template` protocol described in `.agents/AGENTS.md` is
  **dead** — no such directories exist. Don't create them.

## Cross-cutting rules

- Commerce logic lives in Medusa. The storefront fetches through
  `src/lib/data/*` — add helpers there, never inline `fetch` in components.
- Auth surface: `/admin/*` uses Medusa session auth; `/store/*` requires the
  publishable-key header (the SDK sends it); customer auth is real
  (`/auth/*`); `GET /homepage` is deliberately public/keyless.
- **Rate limiting** (`apps/backend/src/api/middlewares.ts`): `/store/*` is
  150 req/min and `/auth/*` 20 per 15 min, **keyed by client IP**. Because the
  storefront is server-rendered, all shoppers share the Next server's IP — this
  is a site-wide ceiling, not a per-user one. It is structurally wrong; don't
  "fix" it by just raising the number.
- Never guess Medusa response shapes — check `API_CONTRACTS.md`, then the code.
  Recurring traps: `variant.options` is an **array** (use `optionsAsKeymap`,
  it is not keyed by name), and store prices need `region_id` /
  `calculated_price` context or they render as `$0`.
- Some `lib/data` helpers still swallow errors and return `null`/`[]`. When you
  touch one, surface the error instead.

## Agent working flow

The roadmap in `docs/PRODUCTION_ROADMAP.md` §4 is the ordered backlog. When
picking up work here:

**1. Orient before editing.** This file and the `docs/` audits are the map, but
the code is the territory. Docs dated before 2026-07-16 (`CODEBASE_MAP.md`,
`BACKEND_PLAN.md`, `FRONTEND_PLAN.md`, `PRODUCTION_AUDIT.md`, `QA_TEST_REPORT.md`,
`Mithra_*.md`) pre-date cart/auth/checkout/search and are **historical only**.

**2. For anything about live data or config, verify against the running system
rather than guessing.** Useful read-only probes that already exist:
```bash
cd apps/backend && npx medusa exec ./src/scripts/diagnose-fulfillment.ts
```
prints regions, stock locations, fulfillment sets, service/geo zones, shipping
options and recent order statuses. (Its "RECENT ORDERS" section shows
`pay:undefined ful:undefined` because it selects narrow fields — Medusa computes
those from relations. That is a limitation of the script, **not** a broken
order.)

**3. Budget backend calls.** See performance invariant (2). Before adding any
`fetch`, `router.refresh()`, prefetch or layout-level `await`, ask what it costs
per page view and whether it lands on the shared rate-limit budget.

**4. Measure latency claims.** "Feels slow" has five distinct causes in this app
(audit §0) and they compound. Attribute a specific one before changing code, and
land the P0 items together — `staleTimes` is wasted while `router.refresh()`
still fires, and vice versa.

**5. Sequencing rule: response before appearance.** Do not start visual redesign
work ahead of the Phase 1 latency items. A redesign on a store where clicks
stall reads as "still slow, and now different."

**6. Prefer switching on what exists over building new.** Phase 0 of the roadmap
is entirely env vars for code that is already written and silently no-op'ing
(SendGrid emails, Stripe webhook verification). Check for that pattern before
assuming a feature is missing.

**7. Don't "fix" a known structural flaw with a bigger number.** The IP-keyed
`/store/*` rate limit and the per-browser cache-tag keying are both understood
and documented; raising the limit or adding another tag makes them worse.

## Claude Code setup

- Repo owner recommends the Ponytail plugin — `/plugin install ponytail@ponytail`.
  If that marketplace isn't configured, skip it; never block work on it.
