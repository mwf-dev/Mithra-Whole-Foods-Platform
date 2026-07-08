# Backend Audit & Production Plan — Mithra Whole Foods (Medusa v2 → GCP Cloud Run)

Audited: `apps/backend` (config, API routes, homepage module, admin UI, seed scripts).
`jobs/`, `links/`, `subscribers/`, `workflows/` are README-only placeholders — nothing to audit.

---

## 🚨 Critical, act before anything else

**Live production DB credential leaked in git.** `apps/backend/get_key.js:5` contains the full Neon connection string including password (`npg_NUPG8ym6Dlkb@ep-dry-frost-...`). `test-db.js` / `test-env.js` and `.env.production` / `.env.development` / `.env.test` are also git-tracked. **Rotate the Neon credential immediately**, delete these files, purge git history (e.g. `git filter-repo`), keep only `.env.template` with placeholders. JWT/cookie secrets are `supersecret` (Medusa's known default) — forgeable admin sessions.

---

## Security Checklist

| Item | Status | Detail |
|---|---|---|
| Secrets in git | ❌ FAIL | Live Neon URL in `get_key.js:5`; `.env.production` etc. tracked; rotate + purge |
| JWT / cookie secrets | ❌ FAIL | `supersecret` placeholders; no fail-fast if unset (`medusa-config.ts:13-14`) |
| DB TLS | ❌ FAIL | `ssl: { rejectUnauthorized: false }` unconditionally (`medusa-config.ts:8`) |
| Admin route auth | ✅ PASS* | `/admin/*` protected by Medusa's built-in `authenticate` middleware; no `middlewares.ts` in repo — protection is implicit, not explicit |
| Public route auth | ⚠️ BY DESIGN | `GET /homepage` deliberately outside `/store` to skip publishable key (`web/src/services/medusa.ts:27`) — read-only but unthrottled and outside `storeCors` |
| Input validation | ❌ FAIL | `POST /admin/homepage` casts `req.body as any`, no schema, no length caps; body-supplied `id` overrides the update target (`api/admin/homepage/route.ts:25-31`) |
| Mass assignment | ❌ FAIL | Raw body spread into create/update; client can set `id`, `created_at` |
| CORS | ⚠️ PARTIAL | Env-driven but non-null-asserted (`medusa-config.ts:10-12`) — silently `undefined` if unset; `/homepage` bypasses `storeCors` entirely |
| Rate limiting | ❌ FAIL | None on any route; public `/homepage` hit per storefront render (`revalidate: 0`) |
| Error handling / leak | ❌ FAIL | No try/catch in any handler; relies on `NODE_ENV=production` to suppress stack traces |
| postMessage security | ❌ FAIL | Admin sends to `'*'` (`admin/routes/homepage/page.tsx:46`); storefront receiver checks no `event.origin` (`web/.../Home.tsx:16`) → anyone can control rendered homepage content in preview context |
| XSS / injection | ⚠️ PARTIAL | Text fields React-escaped; but image URLs interpolated into CSS `url('...')` (`Hero.tsx:34`, `Collections.tsx:65`) → CSS injection via `')` payload |
| File storage | ❌ FAIL | No file module configured → local `./static`, ephemeral on Cloud Run |

---

## API Endpoint Inventory (frontend contract)

### Custom endpoints

| Method | Path | Auth | Request body | Response | Source |
|---|---|---|---|---|---|
| GET | `/homepage` | None (public, intentional) | — | `{ homepage_settings: HomepageSetting \| null }` | `api/homepage/route.ts:5-15` |
| GET | `/admin/homepage` | Admin session | — | `{ homepage_settings: HomepageSetting \| null }` | `api/admin/homepage/route.ts:5-15` |
| POST | `/admin/homepage` | Admin session | `{ hero_title?, hero_subtitle?, hero_image_url?, promo_card_1_title?, promo_card_1_url?, promo_card_2_title?, promo_card_2_url? }` — currently unvalidated | `{ homepage_setting: HomepageSetting }` ⚠️ singular key, differs from GET's plural | `api/admin/homepage/route.ts:17-34` |
| GET | `/admin/custom` | Admin session | — | empty 200 — unused stub, remove | `api/admin/custom/route.ts` |
| GET | `/store/custom` | Publishable key | — | empty 200 — unused stub, remove | `api/store/custom/route.ts` |

`HomepageSetting`: `id, hero_title, hero_subtitle, hero_image_url, promo_card_1_title, promo_card_1_url, promo_card_2_title, promo_card_2_url, created_at, updated_at`.
⚠️ Contract note: frontend type marks `hero_title`/`hero_subtitle` nullable (`medusa.ts:3-14`); DB has `NOT NULL` + defaults.

### Standard Medusa store endpoints used by the web app (`apps/web/src/services/medusa.ts`, via JS SDK + publishable key)

| SDK call | HTTP | Used by | Line |
|---|---|---|---|
| `store.collection.list({ handle: "homepage-best-sellers" })` | GET `/store/collections` | `getBestSellers` | `medusa.ts:48` |
| `store.product.list({ collection_id, fields })` | GET `/store/products` | `getBestSellers` | `medusa.ts:56` |
| `store.category.list({ fields: "*products" })` | GET `/store/product-categories` | `getCategories` | `medusa.ts:70` |
| `store.product.list({ category_id?, fields })` | GET `/store/products` | `getProducts` (shop) | `medusa.ts:91` |
| `store.product.list({ handle, fields })` | GET `/store/products` | `getProductByHandle` (PDP) | `medusa.ts:101` |

Admin UI additionally calls built-in `POST /admin/uploads` (`page.tsx:64`).
Custom raw fetch: `GET ${BACKEND_URL}/homepage` (`medusa.ts:29`).

---

## Module 1 — Config & Entry (`medusa-config.ts`, `instrumentation.ts`, `package.json`)

**Responsibility:** Root Medusa config (DB, CORS, secrets, homepage module registration); OTel hook (fully commented out); build/start scripts. Essentially unmodified starter — no production hardening.

**Issues:**
- `medusa-config.ts:8` — TLS cert verification disabled.
- `medusa-config.ts:13-14` — secrets default to `supersecret` when unset; no fail-fast.
- No Redis modules registered → cache/event-bus/workflow engine are **in-memory**; deps (`@medusajs/cache-redis` etc.) not even installed. Breaks with >1 Cloud Run instance.
- No file module → local-disk uploads (ephemeral).
- No `workerMode` split → scheduled jobs fire N× with N instances, 0× at min-instances=0.
- No migrate step in deploy; `start` runs from project root, not `.medusa/server` build output.

**Fixes (priority):** 1) Secret Manager + fail-fast validation; 2) real TLS (`rejectUnauthorized: true` / `sslmode=verify-full`); 3) Redis modules (Memorystore) wired to `REDIS_URL`; 4) GCS/S3 file provider; 5) `workerMode` env-driven, two Cloud Run services; 6) `medusa db:migrate` as pre-deploy job; start from `.medusa/server`; 7) validated CORS, drop `!` assertions; 8) enable OTel → Cloud Trace.

**Dependencies:** Loaded by every process at boot; every module and route depends on it. Breaking-change risk: low (additive config), but Redis/file module changes alter runtime behavior everywhere.

**Test plan:** Boot without `JWT_SECRET` → hard fail. CORS allow/deny per origin. `PORT=8080` binding. `GET /health` → 200. 2-instance upload-then-fetch (proves GCS). Event fires exactly once across instances. Fresh-DB deploy with migrate step. Load test at concurrency 80 vs Neon connection limits (use pooled endpoint).

**Cloud Run:** Medusa honors `PORT` and exposes `GET /health` — use as probe. Set `NODE_ENV=production`. `min-instances≥1` for worker (jobs) and ideally web (cold starts are heavy). Same image, two services (`server`/`worker`).

---

## Module 2 — API Routes (`src/api/`)

**Responsibility:** Public homepage GET; admin homepage GET/POST upsert; two dead stubs. Thin handlers resolving the homepage module service. No `middlewares.ts` exists.

**Issues:**
- **Upsert race:** read-then-write with no transaction, no singleton constraint (`admin/homepage/route.ts:22-33`). Concurrent first saves → duplicate rows; GET then returns arbitrary `settings[0]` (no orderBy) → edits silently target the wrong row. Real on multi-instance Cloud Run.
- **`id` override:** `{ id: settings[0].id, ...req.body }` — body spread wins, client redirects the update (`:25-28`); create passes raw body incl. `id` (`:31`).
- No validation, no length caps, no try/catch, no rate limiting.
- Envelope inconsistency: GET `homepage_settings` vs POST `homepage_setting`.
- Dead stubs `admin/custom`, `store/custom` shipping to prod.

**Fixes (priority):** 1) `src/api/middlewares.ts` + Zod `validateAndTransformBody` whitelist (7 fields, max lengths, strip `id`); 2) singleton upsert — fixed constant id (e.g. `"homepage"`) or unique constraint + transaction; 3) try/catch with stable error shape; 4) normalize envelope (breaking — coordinate with `medusa.ts` and `page.tsx`); 5) rate-limit + cache `/homepage`; 6) delete stubs.

**Dependencies:** Calls `HomepageService` (module 3). Consumed by storefront `medusa.ts:29` and admin `page.tsx:24,87`. Envelope rename breaks both consumers — do it in one change.

**Test plan:** Empty-DB GET → `null`. Valid POST → one row, 201. Malformed JSON → clean 400. Extra fields / injected `id` → stripped. Multi-MB `hero_title` → rejected. N concurrent POSTs on empty table → exactly one row. Admin routes with no session → 401. `/store/custom` without key → 400.

**Cloud Run:** Race is autoscaling-triggered — fix pre-deploy. `NODE_ENV=production` to suppress stack leaks. `/homepage` is publicly hittable per render with `revalidate: 0` — add cache/CDN + limiter or pay DB per request.

---

## Module 3 — Homepage Module (`src/modules/homepage/`)

**Responsibility:** One entity (`homepage_setting`), bare `MedusaService({ HomepageSetting })` with auto-generated CRUD, one migration. Data layer for the CMS.

**Issues:**
- **No singleton enforcement** at model level (`models/homepage.ts:3-12`) — root cause of the module-2 race.
- Literal-`\n` coupling: default stores escaped `"\\n"` (`models/homepage.ts:5`) and `Hero.tsx:22` splits on literal `'\\n'` — a real newline typed in admin won't line-break.
- Nullable-vs-NOT-NULL drift with frontend type (`medusa.ts:3-14`).
- Soft-delete exists (`Migration...:7`) but no delete/restore path — a soft-deleted singleton makes GET return `null` permanently with no recovery.

**Fixes (priority):** 1) Fixed constant id or unique constraint + migration (enables atomic upsert); 2) decide newline convention (store real `\n`, render `whitespace-pre-line`) — coordinated frontend change; 3) align frontend type nullability; 4) document/no-op the soft-delete path.

**Dependencies:** Called only by module-2 routes. Migration change is the riskiest DB touch in the plan but the table is tiny (0–2 rows); trivial to backfill/dedupe in the migration.

**Test plan:** Migration on a DB that already has duplicate rows (dedupe keeps newest). Create-twice → constraint violation or idempotent update. List excludes soft-deleted. Escaped-newline default renders correctly post-fix.

**Cloud Run:** Stateless — fine once the singleton constraint exists. Run the migration in the pre-deploy migrate job.

---

## Module 4 — Admin UI (`src/admin/routes/homepage/page.tsx`, `i18n/`)

**Responsibility:** Custom admin page: settings form + live-preview iframe of the storefront, pushing edits via `postMessage`. Registers under label "Homepage". `i18n/index.ts` is an empty stub.

**Issues:**
- `iframe src="http://localhost:3000"` hardcoded (`page.tsx:234`) — preview dead everywhere but local.
- `postMessage(..., '*')` (`page.tsx:46`) + storefront receiver validates no origin (`web/.../Home.tsx:16-19`) → any framing/framed page can inject homepage content; combined with CSS `url('...')` interpolation (`Hero.tsx:34`) → CSS injection without touching the DB.
- Uploads to `/admin/uploads` (`page.tsx:64`) land on local disk (no file module) — vanish on Cloud Run.
- Fetch failures swallowed to `console.error` (`page.tsx:33-35`); one `loading` flag shared by upload and save (`page.tsx:63,214`).

**Fixes (priority):** 1) File module first (module 1 fix 4) or uploads are lost; 2) env-driven preview URL (Vite `import.meta.env` var at admin build time); 3) explicit postMessage target origin + `event.origin` allowlist in `Home.tsx`; 4) sanitize/validate image URL before CSS interpolation; 5) error UI + separate loading states; 6) remove or populate the i18n stub.

**Dependencies:** Calls module-2 endpoints + built-in uploads. Contract with storefront `Home.tsx` via postMessage — origin fix must land on both sides simultaneously.

**Test plan:** Preview loads from env URL in deployed admin. Message from wrong origin ignored. Image URL containing `')` doesn't alter styles. Upload survives backend restart (GCS). Fetch failure shows error, save/upload spinners independent.

**Cloud Run:** Admin is served from the backend origin, so relative `/admin/*` calls are fine. Preview iframe needs the deployed storefront URL + matching `adminCors`/frame policy.

---

## Module 5 — Seed & Ops Scripts (`migration-scripts/`, `update-images.ts`)

**Responsibility:** `initial-data-seed.ts` (wired to `npm run seed`) bootstraps store/region/tax/stock/fulfillment/publishable-key + 3 categories, `homepage-best-sellers` collection, 3 products, inventory. `seed-products.ts` is an unwired divergent copy of the catalog portion. `update-images.ts` is an untracked one-off image patch.

**Issues:**
- **Zero idempotency:** re-run duplicates store, region, sales channel, collection (same handle!), categories, products; SKU collisions; inventory-level errors (`initial-data-seed.ts:99-110, 233-242, 424-437`). `getBestSellers` takes `collections[0]` — a duplicate handle silently swaps the homepage product set.
- **Divergent duplicates:** seed uses placeholder coffee-mug images (`initial-data-seed.ts:299,353,392`) and hacks oil onto `Weight: "1kg"` (`:359-363`); `seed-products.ts` has real Unsplash images and correct `"1L"` (`seed-products.ts:78,162-166`). Running both → duplicate catalog with conflicting data.
- No error handling/transactions — partial failure leaves the DB half-seeded; re-run compounds duplicates.
- `update-images.ts` uses remote URLs (Cloud-Run-safe) but is untracked ad-hoc ops.

**Fixes (priority):** 1) Consolidate to one seed — fold seed-products' correct images/options into `initial-data-seed.ts`, delete the other two; 2) idempotency: existence checks by handle/SKU/name + top-level "already seeded" guard; 3) per-step error handling, safe re-run after partial failure; 4) split infra seed (once, always) from demo-catalog seed (skippable in prod).

**Dependencies:** Storefront hard-depends on collection handle `homepage-best-sellers` (`medusa.ts:49`), category names Millets / Cold Pressed Oils / Spices, product handles + variant options (oil 1kg/1L divergence surfaces directly on the PDP).

**Test plan:** Fresh DB → seed → exactly 1 store/region/collection, 3 categories, 3 products, oil variant = `1L`; storefront helpers return 3 items each. Double-run → counts unchanged. Kill mid-run → re-run completes clean.

**Cloud Run:** Run as a **one-off Cloud Run Job** — never on container start (autoscaling → concurrent seeds → duplicates). Keep `db:migrate` (every deploy) separate from seed (once).

---

## Recommended Implementation Order

Safest / lowest-risk first:

1. **Credential rotation + repo hygiene** — rotate Neon password; delete `get_key.js`, `test-db.js`, `test-env.js`; purge tracked `.env.*` from history; set real JWT/cookie secrets. No code behavior change, highest payoff.
2. **Config hardening** — fail-fast secret validation, real DB TLS, validated CORS, `NODE_ENV=production`. Additive, isolated to `medusa-config.ts`.
3. **Delete dead code** — `custom` stub routes, `seed-products.ts`, `update-images.ts`, empty i18n stub. Zero consumers, zero risk.
4. **Seed consolidation + idempotency** — self-contained, no runtime consumers; unblocks safe environment bootstrap.
5. **Input validation + error handling on routes** — `middlewares.ts` + Zod, try/catch, strip `id`. Tightens behavior without changing the happy-path contract.
6. **Singleton enforcement + atomic upsert** — migration + route change together (fixed id). Touches DB schema; do after validation so bad input can't recreate the mess.
7. **File storage → GCS** — new module config + admin upload flow verification; existing `static/` images need migrating to the bucket and `hero_image_url` values updating.
8. **Redis modules + worker split** — biggest infra change (Memorystore, second Cloud Run service, deploy pipeline with migrate job). Do once routes/data are solid.
9. **postMessage origin lockdown + envelope normalization + preview URL env** — last because each requires **coordinated backend + frontend changes** (admin `page.tsx` ↔ storefront `Home.tsx` ↔ `medusa.ts`); ship each pair atomically.

Cross-cutting after step 8: rate limiting + caching for `/homepage` (or move it under `/store` with a publishable key once the frontend can send one — removes the auth bypass entirely; coordinate with `medusa.ts:29`).
