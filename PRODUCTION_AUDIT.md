# Production Security & Bug Audit — Mithra Whole Foods

**Audit Date:** 2026-07-08
**Scope:** Full monorepo — `apps/web` (Next.js 15), `apps/backend` (Medusa v2.17), `apps/web-old` (legacy), build config, deployment artifacts.
**Methodology:** Source code analysis at every layer — runtime code, config, contracts, error handling, auth, secrets, dependencies, build pipeline.

---

## 🔴 Critical — Act Immediately

### CRIT-1: Live Production Database Credentials in Git

**Severity:** 🔴 CRITICAL
**Files:** `apps/backend/.env` (line 3), `apps/backend/get_key.js`, `apps/backend/test-db.js`, `apps/backend/test-env.js`
**What:** The Neon PostgreSQL connection string containing username + password is tracked in git:
```
DATABASE_URL='postgres://neondb_owner:npg_NUPG8ym6Dlkb@ep-dry-frost-...'
```
This is a full read/write credential to the production database. Additionally `.env.production`, `.env.development`, `.env.test` across both apps are git-tracked and contain real credentials.
**Risk:** Anyone with repo access (committers, CI/CD, any future contributor) has unlimited access to the production database.
**Fix:** Rotate the Neon credential immediately → `git filter-repo` purge history → delete tracked `.env.*` files → add to `.gitignore` → keep only `.env.template` with placeholders → document the rotated secret in a password manager / GCP Secret Manager.

### CRIT-2: JWT/Cookie Secrets Default to `supersecret`

**Severity:** 🔴 CRITICAL
**Files:** `apps/backend/medusa-config.ts` (lines 26–27), `apps/backend/.env` (lines 7–8)
**What:** Production fail-fast was added in a previous sprint (lines 5–12 verify in `NODE_ENV=production`), but the fallback in the config object still defaults to `"supersecret"`:
```ts
jwtSecret: process.env.JWT_SECRET || "supersecret",
cookieSecret: process.env.COOKIE_SECRET || "supersecret",
```
**Risk:** If `NODE_ENV` is somehow unset or misconfigured in production (e.g., in Cloud Run config), secrets silently fall back to the known default `supersecret` → **anyone can forge admin JWT tokens**. There is no non-production fail-fast — in development or staging, secrets are always `supersecret`.
**Fix:** Remove the `|| "supersecret"` fallback entirely — throw immediately if either secret is unset, regardless of `NODE_ENV`. Add this check at module load level, not just in the production block.

### CRIT-3: Admin Preview Allows Arbitrary postMessage Injection

**Severity:** 🔴 CRITICAL
**Files:** `apps/backend/src/admin/routes/homepage/page.tsx` (line 44–47)
**What:** The admin page sends preview settings via `postMessage` to the storefront iframe. The origin is now set to `http://localhost:8000`, which is better than `'*'` but the **frontend receiver was removed** — the current `apps/web/src/modules/home/components/hero/index.tsx` has no `addEventListener('message', ...)` listener at all. The `apps/web-old/src/features/home/Home.tsx` has the receiver but that's in the dead legacy app.
**Risk:** The live preview feature is broken (no receiver on the storefront) AND the admin still sends messages to a hardcoded localhost URL — this fails entirely in production. If someone re-adds a receiver without an origin allowlist, the CSS injection vector (see below) becomes exploitable.
**Fix:** Either rebuild the postMessage receiver in the current `Hero.tsx` (or the main page.tsx) with proper `event.origin` allowlist, or remove the iframe preview feature entirely until it can be implemented correctly. Add `event.origin` validation on both sides.

### CRIT-4: CSS Injection via Admin Image URL

**Severity:** 🔴 CRITICAL
**Files:** `apps/web/src/modules/home/components/hero/index.tsx` (line 40), `apps/web/src/modules/products/components/product-preview/index.tsx` (line 42), `apps/web/src/modules/products/templates/index.tsx` (line 65)
**What:** Image URLs from user-editable CMS settings are interpolated directly into CSS `url()`:
```tsx
style={{ backgroundImage: `url('${bgImage}')` }}
```
A malicious admin (or XSS victim) can set `hero_image_url` to `') ; background-color: red; /*` and break out of the style declaration. Since the CMS is admin-only, the direct risk is low, but combined with postMessage injection (#CRIT-3) it becomes exploitable without DB access.
**Risk:** CSS injection via managed CMS content. Combined with a postMessage XSS, an attacker can control arbitrary CSS on the storefront homepage.
**Fix:** Sanitize URL values before interpolation — strip parentheses, single quotes, semicolons. Better: switch to `<img>` tags with `next/image` instead of CSS `backgroundImage`. At minimum, wrap with a validation function.

---

## 🔴 High Severity

### HIGH-1: Seed Script is NOT Idempotent

**Severity:** 🔴 HIGH
**File:** `apps/backend/src/migration-scripts/initial-data-seed.ts`
**What:** Running `pnpm seed` a second time on a non-empty DB **duplicates everything**: store, region, sales channel, collection, categories, products with SKU collisions. The collection `homepage-best-sellers` gets duplicated with the same handle — `getBestSellers` takes `collections[0]` and silently starts showing different products.
**Risk:** In CI/CD, if the seed command is accidentally included in deploy pipeline, production catalog gets corrupted. On local dev, re-running seed breaks everything.
**Fix:** Add existence checks (by handle/SKU/name) before every create step. Add a top-level guard: check if a known product exists, skip entirely if already seeded. Wrap each workflow in try/catch so partial failure doesn't leave a half-seeded state.

### HIGH-2: TypeScript Build Errors Suppressed

**Severity:** 🔴 HIGH
**Files:** `apps/web/next.config.js` (lines 18–20), `apps/web/tsconfig.json` (line 8: `strict: true`)
**What:** 
```js
// next.config.js
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```
All TypeScript errors and ESLint warnings are **silently ignored during build**. Combined with `skipLibCheck: true` in tsconfig, the codebase has zero type safety enforcement at build time.
**Risk:** `pnpm build` always succeeds regardless of type errors. Broken types, undefined variable accesses, and incorrect API shapes ship to production silently.
**Fix:** Remove both `ignoreBuildErrors` and `ignoreDuringBuilds`. Fix all type errors (there are many `any` casts, `@ts-ignore` annotations). At minimum, set `ignoreBuildErrors: false` and fix the errors iteratively.

### HIGH-3: All Errors Swallowed Silently — No Error Boundaries

**Severity:** 🔴 HIGH
**Files:** 70+ `.catch()` handlers across `apps/web/src/lib/data/*.ts`
**What:** The entire frontend data layer follows this pattern:
```ts
.catch(() => null)     // returns null silently
.catch(medusaError)    // throws but never caught by error boundary
```
Pages like `page.tsx` check for `null` region and render — nothing. There are **no error.tsx boundaries** in `app/` (the skeleton `apps/web/src/app/[countryCode]/(main)/error.tsx` and `not-found.tsx` don't exist). SRP: the route structure has:
- `apps/web/src/app/not-found.tsx`
- `apps/web/src/app/[countryCode]/(checkout)/not-found.tsx`
- `apps/web/src/app/[countryCode]/(main)/not-found.tsx`
- `apps/web/src/app/[countryCode]/(main)/cart/not-found.tsx`
But NO `error.tsx` anywhere.
**Risk:** Any backend outage renders empty pages silently — no error UI, no retry, no fallback. Admins won't know the backend is down.
**Fix:** Add `error.tsx` to `(main)/` route group. Surface backend errors in the data layer instead of swallowing to `null`/`[]`. Add `loading.tsx` skeletons (only exists for cart, order confirmed, and account pages — missing for main routes like store and categories).

### HIGH-4: Two Package Managers in Monorepo

**Severity:** 🔴 HIGH
**Files:** Root `package.json` (`pnpm@9.0.0`), `apps/web/package.json` (`yarn@4.12.0`)
**What:** The root uses `pnpm@9` workspace manager, but `apps/web/package.json` declares `"packageManager": "yarn@4.12.0"` with a `.yarn/` directory and `yarn.lock`. Running `pnpm install` at root installs backend deps via pnpm, but **web deps are installed by pnpm too** (ignoring the yarn declaration). The `yarn.lock` in `apps/web/` is stale/conflicting.
**Risk:** `pnpm install` works but the `yarn.lock` is a red herring — anyone running `cd apps/web && yarn install` gets a conflicting lock file. The declared package manager mismatch confuses CI/CD tooling.
**Fix:** Remove `apps/web/packageManager` and `apps/web/.yarn/` directory and `apps/web/yarn.lock`. Standardize on pnpm for everything. Remove the `apps/web/.yarnrc.yml`.

### HIGH-5: Next.js React 19 with `latest` Tag Dependencies

**Severity:** 🔴 HIGH
**Files:** `apps/web/package.json`
**What:** `@medusajs/js-sdk`, `@medusajs/ui`, `@medusajs/icons` are all pinned to `"latest"` — not even a semver range. This means every `pnpm install` or rebuild can pull breaking changes. Next.js is pinned to `15.3.9` but React is `19.0.5` with overrides — mismatch with `@medusajs/ui` which may expect React 18.
**Risk:** Builds are non-deterministic. A `latest` release of `@medusajs/js-sdk` could break API calls silently. React 18/19 mismatch in the UI library could cause runtime crashes.
**Fix:** Pin all `latest` deps to specific semver ranges. Verify `@medusajs/ui` compatibility with React 19. Run `pnpm why react` to confirm no duplicate React versions.

---

## 🟡 Medium Severity

### MED-1: Homepage Settings Envelope Mismatch (GET vs POST)

**Severity:** 🟡 MEDIUM
**Files:** `apps/backend/src/api/homepage/route.ts`, `apps/backend/src/api/admin/homepage/route.ts`
**What:** 
- `GET /homepage` → `{ homepage_settings: {...} }` (plural)
- `POST /admin/homepage` → `{ homepage_setting: {...} }` (singular)
**Risk:** If any code reads from the wrong key (or if both GET and POST responses need to be processed by the same parser), it fails silently with `undefined`.
**Fix:** Normalize both to `homepage_setting` (singular) or `homepage_settings` (plural). Update `apps/web/src/app/[countryCode]/(main)/page.tsx` line 22 and the admin `page.tsx` line 27 in the same commit.

### MED-2: No Upsert Transaction / Singleton Constraint

**Severity:** 🟡 MEDIUM
**Files:** `apps/backend/src/api/admin/homepage/route.ts` (lines 22–44), `apps/backend/src/modules/homepage/models/homepage.ts`
**What:** The admin POST handler is read-then-write with no database transaction:
```ts
const settings = await homepageModuleService.listHomepageSettings()
if (settings.length > 0) {
  await updateHomepageSettings(...)
} else {
  await createHomepageSettings(...)
}
```
Concurrent requests on multi-instance Cloud Run can create duplicate rows. There is no unique constraint on the model. GET then returns `settings[0]` with no `orderBy` — edits may silently target the wrong row.
**Risk:** Duplicate homepage settings rows, updates affecting wrong row, hard to debug.
**Fix:** Add a unique constraint on a fixed id (e.g., `id = "homepage"`), or use a database transaction with `SELECT ... FOR UPDATE`. In the migration, deduplicate existing rows.

### MED-3: Admin Uploads Go to Local Disk (Ephemeral)

**Severity:** 🟡 MEDIUM
**Files:** `apps/backend/src/admin/routes/homepage/page.tsx` (line 64)
**What:** File uploads use `POST /admin/uploads` which stores files to `./static/` on local disk. No GCS/S3 file module is configured in `medusa-config.ts`.
**Risk:** On Cloud Run (ephemeral filesystem), uploaded images vanish on every deployment, autoscale, or restart. Product images lose their URLs. The admin preview shows broken images.
**Fix:** Configure a file module (GCS or S3) in `medusa-config.ts`. Or at minimum, document this limitation clearly.

### MED-4: `console.log` in Production Server Components

**Severity:** 🟡 MEDIUM
**Files:** `apps/web/src/app/[countryCode]/(main)/page.tsx` (line 49)
**What:**
```ts
console.log("PRODUCTS RETURNED:", products.length);
```
This runs on every homepage request in production — it's a server component so it logs to the server console, but it's still debug output.
**Risk:** Logs clutter production logging systems (Cloud Logging, Datadog, etc.), costing money and making real errors harder to find.
**Fix:** Remove `console.log` before production deploy. Use proper structured logging if needed.

### MED-5: Placeholder Image Host Not in `remotePatterns`

**Severity:** 🟡 MEDIUM
**File:** `apps/web/next.config.js` (lines 21–44)
**What:** The `remotePatterns` config for `next/image` doesn't include `placehold.co` — currently no `next/image` is used; images are CSS `backgroundImage` divs, so it doesn't error. But when switching to `next/image` (as planned), placehold.co images will be blocked by Next.js.
**Risk:** When images are ported to `<Image>` components, all placeholder images break.
**Fix:** Add `{ protocol: "https", hostname: "placehold.co" }` to `remotePatterns` alongside the migration to `next/image`.

### MED-6: Homepage Fetches Sequential Instead of Parallel

**Severity:** 🟡 MEDIUM
**File:** `apps/web/src/app/[countryCode]/(main)/page.tsx` (lines 29–48)
**What:** Region fetch, homepage settings fetch, and product listing are **awaited sequentially**:
```ts
const region = await getRegion(countryCode)
const settings = await fetchHomepageSettings()
const { response: { products } } = await listProducts(...)
```
Each adds 100–300ms latency → total ~500ms+ before HTML starts streaming.
**Risk:** Slow homepage load time directly impacts user experience and Core Web Vitals (LCP).
**Fix:** Use `Promise.all`:
```ts
const [region, settings, { response: { products } }] = await Promise.all([
  getRegion(countryCode),
  fetchHomepageSettings(),
  listProducts(...).catch(...)
]);
```

### MED-7: Checkout `as any` Type Abuse

**Severity:** 🟡 MEDIUM
**Files:** 
- `apps/web/src/modules/checkout/templates/checkout-summary/index.tsx` (line 8): `{ cart }: { cart: any }`
- `apps/web/src/modules/cart/templates/index.tsx` (line 34): `Summary cart={cart as any}`
- `apps/web/src/modules/cart/templates/index.tsx` (line 20)
**What:** Cart and checkout components use `any` types, bypassing TypeScript checking for all cart properties. Any Medusa SDK response shape change silently breaks these components.
**Risk:** Type errors in the critical checkout flow are invisible until runtime.
**Fix:** Use proper `HttpTypes.StoreCart` types throughout. Remove all `as any` casts on cart objects.

---

## 🟢 Low Severity / Code Hygiene

### LOW-1: Unused Dependencies (~15 packages)

**Files:** `apps/web/package.json`
**What:** These packages are installed but never imported anywhere in `apps/web/src/`:
- `zustand`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `embla-carousel-react`, `framer-motion`, `@base-ui/react`, `tw-animate-css`
- `pg` (Postgres client — belongs in backend, not frontend)
- `@types/react-instantsearch-dom`, `react-instantsearch-dom` typings
- `webpack` (Next.js bundles its own)
**Impact:** Larger `node_modules`, slower CI installs, larger Vercel build context, confusing to developers.
**Fix:** Run `depcheck` or manually audit and `pnpm remove` unused packages.

### LOW-2: Old Web App (`apps/web-old`) Ships in `src`

**Files:** `apps/web-old/`
**What:** The entire previous implementation — `features/home/`, `features/shop/`, `features/product/`, `features/layout/`, legacy `services/medusa.ts` — is still in the monorepo. The old `Home.tsx` contains postMessage listener code (line 22) that references the old architecture.
**Risk:** Confusion — new developers may edit the old files. Dead code in the monorepo increases cognitive load and search results noise.
**Fix:** Delete `apps/web-old/` entirely after verifying nothing is still referenced. Files with `postMessage` in the old app are already dead code.

### LOW-3: `onboarding.ts` Hardcodes Localhost Admin URL

**File:** `apps/web/src/lib/data/onboarding.ts` (line 8)
**What:**
```ts
redirect(`http://localhost:7001/a/orders/${orderId}`)
```
Hardcoded localhost URL for onboarding flow redirect. In production, points to nowhere.
**Fix:** Make the admin URL configurable via env var: `MEDUSA_ADMIN_URL`.

### LOW-4: Dead Admin UI Stubs in Backend

**Files:** 
- `apps/backend/src/api/admin/custom/route.ts`
- `apps/backend/src/api/store/custom/route.ts`
- `apps/backend/src/admin/i18n/index.ts` (empty stub with README)
**What:** Three dead endpoint/UI files that do nothing — return empty 200.
**Fix:** Delete all three. They ship to production as unused endpoints.

### LOW-5: Broken Onboarding CTA Link

**File:** `apps/web/src/modules/products/components/product-onboarding-cta/index.tsx` (line 22)
**What:** Points to `http://localhost:7001/a/orders?onboarding_step=create_order_nextjs` — dead link in production.
**Fix:** Make configurable via env var or remove if onboarding flow is complete.

### LOW-6: `@ts-ignore` in Country/Language Select

**Files:** 
- `apps/web/src/modules/layout/components/country-select/index.tsx` (lines 81, 114)
- `apps/web/src/modules/layout/components/language-select/index.tsx` (lines 135, 169)
**What:** `@ts-ignore` used to suppress type errors in Headless UI `Listbox.Option` components.
**Fix:** Fix the underlying type issues instead of suppressing them.

### LOW-7: `@medusajs/types` Should Be a Dependency, Not DevDep

**File:** `apps/web/package.json`
**What:** `@medusajs/types` (latest) is in `devDependencies`, but it's used in runtime code throughout `src/lib/`, `src/modules/`, and `src/app/` (e.g., `HttpTypes.StoreProduct`).
**Fix:** Move to `dependencies` — or verify that TypeScript's `preserve` mode doesn't require it at runtime (Next.js bundles types away, so this may not cause a runtime error, but it's semantically incorrect).

### LOW-8: ESLint Config Inconsistency

**Files:** `apps/web/.eslintrc.js` vs `apps/backend/eslint.config.ts`
**What:** Web uses deprecated `.eslintrc.js` format (ESLint 8 flat config not supported), backend uses new `eslint.config.ts` (flat config). The web eslint config just extends `next/core-web-vitals` which is minimal.
**Fix:** Align both to flat config format. Verify lint actually catches issues beyond the default Next.js rules.

---

## 🔗 Frontend ↔ Backend Connection Issues

### CONN-1: No Shared Types Between Frontend and Backend

**What:** The frontend defines its own `HomepageSettings` interface inline (`hero/index.tsx:3-8`), the backend defines it in `models/homepage.ts`. They drift independently. The frontend marks `hero_title`/`hero_subtitle` as optional (`?`), the backend has `NOT NULL` with defaults.
**Impact:** Mismatched expectations — if backend ever returns null for these fields, the frontend handles it gracefully by coincidence (fallback defaults). But an API consumer wouldn't know what's guaranteed vs nullable.
**Fix:** Either extract types to a shared `packages/` workspace, or generate TypeScript types from the backend model. At minimum, document field nullability contracts precisely.

### CONN-2: Envelope Key Mismatch (GET vs POST)

**Severity:** 🟡 MEDIUM (repeated from MED-1 for emphasis)
**What:** `GET /homepage` → `homepage_settings`, `POST /admin/homepage` → `homepage_setting`. Frontend page.tsx reads `data.homepage_settings` (line 22). Admin page reads `data.homepage_settings` for initial load (line 27) but would need to handle the POST response differently if it used the returned value.
**Fix:** Choose one key and use it everywhere.

### CONN-3: PostMessage Contract Dead

**What:** Admin `page.tsx` sends `postMessage({ type: 'UPDATE_PREVIEW', settings }, 'http://localhost:8000')`, but the current storefront (`apps/web/src/modules/home/components/hero/index.tsx`) has NO message event listener. The listener exists only in `apps/web-old/src/features/home/Home.tsx` (dead code).
**Impact:** Live preview feature is completely non-functional. Admin edits to homepage settings do not update the preview iframe.
**Fix:** Either rebuild the postMessage receiver in the current `Hero.tsx` or `page.tsx` with proper origin validation, or remove the preview iframe from the admin panel if the feature is not needed.

### CONN-4: Backend URL Configuration Chaos

**Files:** Multiple sources define the backend URL differently:
- `apps/web/src/lib/config.ts`: `process.env.MEDUSA_BACKEND_URL` (Server-only)
- `apps/web/src/middleware.ts`: `process.env.MEDUSA_BACKEND_URL` (Edge Runtime)
- `apps/web/src/app/[countryCode]/(main)/page.tsx`: `process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"` (inline raw fetch)
- `apps/web/src/modules/home/components/hero/index.tsx`: `process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"` (inline, in client component! — `NEXT_PUBLIC` needed)
- `apps/web/src/lib/util/env.ts`: `process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:8000"` (public-facing URL)
**Impact:** The hero component reads a server-only env var (`MEDUSA_BACKEND_URL`) in a **client component** — on the browser, this is always `undefined`, so it defaults to `http://localhost:9000`. In production, all hero image URL construction from relative paths will break.
**Fix:** Create a single source of truth for backend URL in `src/lib/config.ts` and export it. Add a `NEXT_PUBLIC_MEDUSA_BACKEND_URL` for browser-accessible code paths. Remove the inline `process.env.MEDUSA_BACKEND_URL` from Hero.tsx.

---

## 🏗 Infrastructure & Deployment Issues

### DEPLOY-1: No `.env.template` Documenting All Required Vars

**Files:** `apps/backend/.env.template` (incomplete), `apps/web/.env.template` (exists)
**What:** 
- Backend `.env.template` has database URL, secrets, CORS — incomplete.
- Web `.env.template` has `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_DEFAULT_REGION`, `NEXT_PUBLIC_BASE_URL`, `REVALIDATE_SECRET`
- Missing from template: Stripe keys, Medusa Payments keys, locale config, admin URL.
**Fix:** Create comprehensive `.env.template` files for both apps with all env vars documented with placeholder values.

### DEPLOY-2: `turbopack` Used in Dev But Not Build

**File:** `apps/web/package.json` (line 11)
**What:**
```json
"dev": "next dev --turbopack -p 8000",
"build": "next build",
```
No `--turbopack` on build (correct — Turbopack doesn't support production builds on Next 15.5). But dev and build use different bundlers — what works in dev (Turbopack) may fail in production build (Webpack).
**Fix:** This is acceptable but be aware of dev/prod bundler differences. Test builds locally before deploying.

### DEPLOY-3: `pg` Dependency in Frontend

**File:** `apps/web/package.json`
**What:** The `pg` (node-postgres) package is in web's dependencies. This is a Node.js PostgreSQL client — it should never be in the browser bundle.
**Impact:** Increases bundle size unnecessarily. If somehow imported, could leak database credentials to the client.
**Fix:** Remove from `apps/web/package.json`. If needed for some reason, verify it's only used in server-only code paths (unlikely).

---

## 🧪 Testing Gaps

### TEST-1: Zero Tests Across Entire Codebase

**Backend:** Jest configured (`jest.config.js`) but no test files exist. The `integration-tests/` directory referenced in config doesn't exist — running `test:integration:http` or `test:integration:modules` will fail.
**Frontend:** No testing framework installed — no Jest, Vitest, Playwright, or Cypress.
**Risk:** No regression safety. Any change is a blind deployment.
**Fix:** Start with unit tests for `lib/data/*.ts` functions and critical backend routes.

### TEST-2: Jest Setup Points to Missing Directory

**File:** `apps/backend/jest.config.js` (line 10)
**What:**
```js
setupFiles: ["./integration-tests/setup.js"],
```
This file doesn't exist. `modulePathIgnorePatterns` doesn't exclude `integration-tests/` even though the dir is missing.
**Fix:** Remove the `setupFiles` reference or create the file. Add `integration-tests/` to ignore patterns.

---

## 📋 Summary Count

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🔴 High | 5 |
| 🟡 Medium | 7 |
| 🟢 Low | 8 |
| 🔗 Connection | 4 |
| 🏗 Deployment | 3 |
| 🧪 Testing | 2 |
| **Total** | **33** |

---

## 🏁 Recommended Fix Order

1. **CRIT-1, CRIT-2** — Rotate credentials, fix JWT secrets (security — do BEFORE any code change)
2. **CRIT-3, CRIT-4** — Fix postMessage / CSS injection (preview feature either works securely or is removed)
3. **HIGH-1** — Fix seed idempotency (enables reliable CI/CD)
4. **HIGH-2** — Fix TypeScript build suppression (removes blind spot)
5. **HIGH-4** — Standardize on pnpm (fix package manager confusion)
6. **HIGH-3** — Add error boundaries and surface errors (prod resilience)
7. **CONN-1, CONN-2, CONN-3, CONN-4** — Fix all frontend↔backend connection issues
8. **MED-1 through MED-7** — Medium-severity fixes
9. **LOW-1 through LOW-8** — Code hygiene cleanup
10. **TEST-1, TEST-2** — Testing infrastructure
