# CLAUDE.md — Mithra Whole Foods (canonical agent instructions)

Single source of truth for AI agents. `AGENTS.md`, `AGENT.md`, and
`.agents/AGENTS.md` defer to this file. **Trust the code over any doc,
including this one** — verify before you assert. Everything below was checked
against the repo and the running backend on **2026-07-16**.

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

## Real remaining gaps (as of 2026-07-16)

- **`STRIPE_WEBHOOK_SECRET` is unset** → the Stripe module registers with
  `webhookSecret: undefined`, so webhook signatures at
  `/hooks/payment/stripe_stripe` are not verified. Payments work; async webhook
  confirmation should not be trusted until this is set.
- **`SENDGRID_API_KEY` is unset** → the notification module is never
  registered, so the `order-placed` / `shipment-created` subscribers **no-op
  silently**. Order emails do not send. Don't debug "missing emails" as a
  subscriber bug; it is a missing env var.

## Repo map

| Path | Purpose |
|---|---|
| `apps/web/` | Storefront (Medusa Next.js starter layout — see below). No `apps/web/CLAUDE.md` exists. |
| `apps/backend/` | Medusa backend + admin → `apps/backend/CLAUDE.md` (⚠️ itself stale: it claims no Redis/file/payment modules and no `middlewares.ts`; both are wrong) |
| `packages/` | Empty placeholder |
| `docs/` | `STRIPE_SETUP.md`, `ADMIN_ORDER_GUIDE.md`, `PERFORMANCE_TODO.md` |
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

## Claude Code setup

- Repo owner recommends the Ponytail plugin — `/plugin install ponytail@ponytail`.
  If that marketplace isn't configured, skip it; never block work on it.
