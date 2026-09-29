# Frontend Audit & Production Plan — Mithra Whole Foods (Next.js 15 → Vercel)

Audited: `apps/web/src` (35 files, ~1,600 LOC). Cross-referenced against BACKEND_PLAN.md's API Endpoint Inventory.
`src/store/`, `src/hooks/`, `src/types/`, `src/components/shared/` are **empty directories** — no state management, no shared types layer exists yet. There is no auth flow and no cart implementation anywhere (Header cart badge is a hardcoded "3").

---

## 🔗 Breaking Change Map — frontend/backend pairs that must ship together

| # | Frontend change | Backend change | Refs |
|---|---|---|---|
| 1 | `medusa.ts:39` reads `data.homepage_settings` | Envelope normalization (BACKEND_PLAN module 2, fix 4): POST returns `homepage_setting` (singular), GET plural. If backend normalizes, update `medusa.ts:39` and admin `page.tsx` in the same commit | `api/homepage/route.ts` ↔ `medusa.ts:39` |
| 2 | `Home.tsx:16-19` postMessage receiver must add `event.origin` allowlist | Admin `page.tsx:46` must replace `'*'` with explicit target origin (BACKEND_PLAN module 4, fix 3) | Ship atomically or preview breaks |
| 3 | `Hero.tsx:22` splits title on literal `'\\n'` | Backend default stores escaped `"\\n"` (`models/homepage.ts:5`). Decision: store real newlines, render with `whitespace-pre-line` — change both sides + migrate existing row together (BACKEND_PLAN module 3, fix 2) | |
| 4 | `medusa.ts:29` raw-fetches unauthenticated `${BACKEND_URL}/homepage` | If backend moves it under `/store/homepage` with publishable key (BACKEND_PLAN cross-cutting item), switch this to `sdk.client.fetch` with the key header in the same deploy | |
| 5 | `HomepageSettings` type marks `hero_title`/`hero_subtitle` nullable (`medusa.ts:5-6`) | DB is NOT NULL with defaults. Align type when backend adds Zod validation (BACKEND_PLAN module 2, fix 1) — low risk, type-only | |
| 6 | `Shop.tsx:110`, `ProductDetails.tsx:154`, `BestSellers.tsx:10` read `variants[0].options.Weight` (object access) | Medusa v2 returns `variant.options` as an **array** of option values — this always misses and falls back to `'1kg'`. Also seed divergence: oil is `1kg` in the wired seed vs `1L` in `seed-products.ts` (BACKEND_PLAN module 5). Fix frontend accessor + seed consolidation together so the PDP shows the true variant | |
| 7 | Price reads `variants[0].prices[0].amount` (`medusa.ts:58`, `Shop.tsx:111`, etc.) | Medusa v2 store API does not expose raw `prices` without pricing context — must request `*variants.calculated_price` with `region_id`/`currency_code`. Requires a region lookup (`GET /store/regions`) or env-pinned region id. Verify against the running backend; likely renders 0.00 today on store endpoints | |

---

## Module 1 — API Client Layer (`src/services/medusa.ts`)

**Responsibility:** Single Medusa JS SDK instance + 5 fetch helpers (homepage settings, best sellers, categories, products, product-by-handle). Only file touching `process.env`.

**Issues:**
- All errors swallowed to `console.error`, returning `null`/`[]` (`medusa.ts:33-43,62-65,75-78,93-96`) — an outage renders an empty-but-200 homepage; impossible to distinguish "no data" from "backend down".
- `{ next: { revalidate: 0 } }` passed as the SDK's second arg (`medusa.ts:50,59,72,91,104`) is the **headers** parameter — it's a no-op, not a cache directive.
- No pricing context: no `region_id`/`currency_code` on product queries (breaking-change #7); `fields: "*variants.prices"` is not a store-API field.
- `getCategories` requests `fields: "*products"` (`medusa.ts:71`) — pulls every product of every category just to show counts (`ShopByCategory.tsx:6`).
- Fallback `"http://localhost:9000"` (`medusa.ts:16`) silently ships a broken prod build if the env var is unset.
- `any` return types throughout; `HomepageSettings` nullability drift (breaking-change #5).

**Fixes (priority):** 1) Add region/currency context + `*variants.calculated_price` (breaking-change #7); 2) fail fast at module load if `NEXT_PUBLIC_MEDUSA_BACKEND_URL` unset in production; 3) throw or return typed `Result` on non-OK so pages can show error states; 4) replace fake revalidate with real Next caching (`fetch` for `/homepage`; for SDK calls use route-segment `export const revalidate = 60` since SDK calls aren't Next-fetch-cached); 5) replace `*products` with `fields: "id,name,handle"` + product count via `limit=1` metadata or a computed field; 6) define `Product`/`Variant` types in `src/types/`.

**Backend contracts:** `GET /homepage` (public, no key — see breaking-change #4); `GET /store/collections?handle=homepage-best-sellers`; `GET /store/products`; `GET /store/product-categories`. Matches BACKEND_PLAN inventory. ⚠️ Mismatches: envelope (#1), prices field (#7), nullability (#5).

**Test plan:** Backend stopped → pages render error/fallback UI, not silent empties. Wrong publishable key → visible error. Verify actual price JSON from `/store/products` with and without `region_id`. Slow backend (throttle) → loading states appear.

**Vercel:** Both env vars are `NEXT_PUBLIC_*` (browser-exposed — correct for publishable key + URL; never add admin secrets here). Set per-environment in Vercel dashboard; local `.env.production`/`.env.development`/`.env.test` are untracked — keep them out of git, add `.env.template`.

---

## Module 2 — Routing & Pages (`src/app/`)

**Responsibility:** Root layout (fonts, metadata, `GlobalShell`), `/` (home), `/shop`, `/products/[handle]`. All server components fetching via module 1.

**Issues:**
- **Duplicate header/footer:** `layout.tsx:30` wraps every page in `GlobalShell` (TopBanner+Header+CategoryNav+Footer), but `shop/page.tsx:12-14` and `products/[handle]/page.tsx:23-26` render `<Header/>`/`<Footer/>` again — two headers, two footers on those pages.
- **Next 15 breakage:** `params` is a Promise in Next 15; `products/[handle]/page.tsx:6` destructures it synchronously — deprecation warning now, build/type error under `--turbopack` builds and future versions.
- No `loading.tsx`, `error.tsx`, or `not-found.tsx` anywhere in `app/` — no route-level loading, error, or 404 handling.
- Unknown handle: `page.tsx:24` passes `null` product to `ProductDetails` (crashes — see module 4) instead of `notFound()`.
- `app/page.tsx:5-7` awaits three fetches sequentially — 3× backend latency serialized.
- No per-page `metadata`/`generateMetadata` — every page titled "Mithra Whole Foods"; no OG tags for PDP.

**Fixes (priority):** 1) Remove Header/Footer from `shop/page.tsx` and `products/[handle]/page.tsx`; 2) `const { handle } = await params`; 3) `if (!product) notFound()` + `app/not-found.tsx`; 4) add `loading.tsx` (skeletons) and `error.tsx` per route group; 5) `Promise.all` the home fetches; 6) `generateMetadata` on PDP (title, description, OG image from product).

**Backend contracts:** Aggregates module-1 helpers only; no direct calls.

**Test plan:** Visit `/shop` and a PDP — exactly one header/footer. `/products/does-not-exist` → 404 page, not 500. Throttled network → skeleton visible. Kill backend → `error.tsx` boundary, homepage still renders with fallback content. `next build` passes with awaited params.

**Vercel:** All pages are dynamic (uncached fetches) → every view is a serverless invocation hitting the backend. After module-1 fix 4, add `export const revalidate = 60` (ISR) so pages serve from edge cache. No API routes exist; none needed yet.

---

## Module 3 — Home Feature (`src/features/home/`)

**Responsibility:** `Home.tsx` client wrapper (holds settings state, listens for admin-preview postMessage) + 8 section components. Hero/Collections consume CMS settings; BestSellers/ShopByCategory consume live data; rest are static.

**Issues:**
- **postMessage receiver validates no origin** (`Home.tsx:16-19`) — any page framing the site can inject arbitrary settings (breaking-change #2), which flow into…
- **CSS injection:** image URLs interpolated into `url('...')` (`Hero.tsx:34`, `Collections.tsx:65`) — a `')` payload escapes the declaration. Combined with #2, exploitable without DB access.
- Literal-`\n` split (`Hero.tsx:22`, breaking-change #3).
- `BestSellers.tsx:18-29` falls back to one dummy product when the API returns empty — masks outages; fake ratings/reviews hardcoded (`BestSellers.tsx:13-14`).
- `MostLovedProducts.tsx` is 100% dummy data but appears unrendered (not in `Home.tsx:26-35`) — dead code, delete or wire up.
- `ShopByCategory.tsx:7` ignores real category images (placeholder URL built from name); category cards aren't links.
- `Newsletter.tsx:15` form has no submit handler — posts nowhere, page reloads.
- All images are CSS `background-image` divs — zero `alt` text, no `next/image` optimization; index keys throughout.

**Fixes (priority):** 1) Origin allowlist in `Home.tsx` (breaking-change #2); 2) validate/sanitize image URLs before CSS interpolation (allow only http(s) + relative, strip quotes/parens) or switch to `next/image`; 3) newline fix (#3); 4) replace BestSellers dummy fallback with honest empty state; 5) delete or wire `MostLovedProducts`; 6) link category cards to `/shop?category=`; 7) Newsletter: handler or remove; 8) `next/image` + alt text pass.

**Backend contracts:** `HomepageSetting` fields via props; postMessage `{type:'UPDATE_PREVIEW', settings}` contract with admin `page.tsx` (breaking-change #2). Depends on collection handle `homepage-best-sellers` and category seed names (BACKEND_PLAN module 5).

**Test plan:** postMessage from wrong origin → ignored. Image URL containing `')` → no style escape. Empty best-sellers collection → empty state, not dummy card. Admin preview still live-updates after origin fix. Newline typed in admin renders as line break.

**Vercel:** None specific; static sections are fine. Placeholder `placehold.co` images are external — replace before launch (also needed for `next/image` `remotePatterns`).

---

## Module 4 — Product Feature / PDP (`src/features/product/ProductDetails.tsx`)

**Responsibility:** Client component: gallery, variant selector, quantity stepper, add-to-cart button (non-functional), trust badges, related products.

**Issues:**
- **Crash before null check:** `ProductDetails.tsx:9` reads `product.variants` in `useState` before the `if (!product)` guard at line 11 — unknown handle throws `TypeError` → 500 (pairs with module-2 fix 3).
- Price: `selectedVariant?.prices?.[0]?.amount` (`ProductDetails.tsx:13`) — breaking-change #7; shows `₹0.00` if prices absent.
- Currency inconsistency: PDP shows `₹` (`:57`), `ProductCard` shows `$` (`ProductCard.tsx:51-53`) — same catalog, two currencies, both hardcoded.
- Variant options: `v.options?.[option.title]` (`:79`) — object access on a v2 array (breaking-change #6); falls back to variant title, so it half-works by luck.
- Hardcoded "124 Reviews", "In Stock" (`:53-54`) — no inventory check despite `manage_inventory` in seed.
- Add to Cart / quantity are dead UI — no cart module exists (Medusa cart endpoints unused).
- Single image only (`:14`); no gallery despite layout implying one.
- `page.tsx:17-18` fallback fetches *all* products when the product has no category — wasteful.

**Fixes (priority):** 1) Move null check above `useState` (or guard in page — module-2 fix 3); 2) pricing context + single currency formatter (`Intl.NumberFormat('en-IN')` in `lib/`); 3) fix option→variant matching for v2 arrays; 4) real stock badge from `variant.inventory_quantity`/`calculated_price` availability; 5) remove or implement quantity/cart (see order below); 6) image gallery from `product.images`.

**Backend contracts:** `GET /store/products?handle=…&fields=*variants,*options,*categories` (`medusa.ts:101-104`). Mismatches: #6, #7. Future: `POST /store/carts` + line-items (not in BACKEND_PLAN — flag for backend when cart ships).

**Test plan:** Unknown handle → 404. Product with 2 variants → selecting each updates price and option label correctly. Product with no category → related section sane. Empty `images` → placeholder. Verify ₹ formatting with real seeded prices (oil 1L variant per BACKEND_PLAN module 5).

**Vercel:** None specific. PDP is the page that most needs `generateMetadata` + ISR for SEO.

---

## Module 5 — Shop Feature (`src/features/shop/Shop.tsx`)

**Responsibility:** Client-side listing: category filter sidebar, sort dropdown, product grid, empty state. Server page fetches all products + categories once.

**Issues:**
- Filter/sort state is client-only `useState` (`Shop.tsx:8-9`) — not URL-driven: no shareable/bookmarkable filtered views, state lost on back-navigation, and `CategoryNav`/`ShopByCategory` can't deep-link into a category (their `/category/*` links 404 — module 6).
- Sorting by `variants[0].prices[0].amount` (`Shop.tsx:21-23`) — breaking-change #7 makes all prices 0, so price sort is currently a no-op.
- Category filter matches on `c.name` string (`Shop.tsx:16`) — brittle; use `id`/`handle`.
- No pagination: `getProducts()` fetches with Medusa's default `limit` (50) — silently truncates as the catalog grows; "featured" sort is unimplemented passthrough.
- Grid keys are indexes (`Shop.tsx:107`); no loading skeleton (covered by module-2 `loading.tsx`).
- Good: proper empty state with clear-filters (`Shop.tsx:93-103`) — the only one in the app.

**Fixes (priority):** 1) Read `?category=<handle>&sort=` via `searchParams`, sync with `router.replace` — unlocks module-6 nav links; 2) filter by handle/id; 3) pricing fix (#7) then verify sorts; 4) server-side pagination (`limit`/`offset` + count) once catalog >20 items; 5) keys → `p.id`.

**Backend contracts:** `GET /store/products?fields=*variants,*categories` and `GET /store/product-categories?fields=*products` (`medusa.ts:81-97,68-79`). Mismatch #7 (prices). Category counts depend on the heavy `*products` field (module-1 fix 5).

**Test plan:** Filter each seeded category → correct 1–3 products. `?category=millets` deep link works and survives refresh/back. Price sorts actually reorder. 0-product category → empty state. Slow API → skeleton.

**Vercel:** After URL-state fix the page can stay dynamic (searchParams) — exclude from ISR or use `dynamicParams`; fine either way at current scale.

---

## Module 6 — Layout Feature (`src/features/layout/`)

**Responsibility:** `GlobalShell.tsx` composes TopBanner + Header + CategoryNav + Footer around every route (`layout.tsx:30`). All static server components.

**Issues:**
- **Broken links everywhere:** `CategoryNav.tsx:6-12` links 7 `/category/*` routes; `TopBanner.tsx:10-17` links `/about`, `/farms`, `/contact`; `Hero.tsx:63,74` links `/offers`, `/category/oils`; ~20 Footer links are `href="#"` (`Footer.tsx:36-72`). None of these routes exist → 404s across primary nav.
- `CategoryNav` categories are hardcoded and don't match the 3 seeded categories (Millets, Cold Pressed Oils, Spices per BACKEND_PLAN module 5) — nav promises Ghee/Rice/Sweeteners that don't exist.
- Header dead UI: search inputs (`Header.tsx:30-38,63-72`) submit nowhere; Login/Wishlist are buttons with no action (`:42-49`); cart badge hardcoded "3" (`:53-55`).
- No mobile menu — nav links hidden below `lg` with no hamburger (`Header.tsx:22`); `CategoryNav` hidden below `md` (`CategoryNav.tsx:16`) → phones get zero navigation beyond the logo.
- A11y: icon-only buttons lack `aria-label`; search input lacks a label/form element.
- Footer social icons are text-letter divs (`Footer.tsx:25-28`).

**Fixes (priority):** 1) Point all category links at `/shop?category=<handle>` (requires module-5 fix 1) and render `CategoryNav` from `getCategories()`; 2) mobile hamburger menu; 3) remove or hide dead UI (search, wishlist, login, cart badge) until backed by features — a fake cart count on a store with no cart is a launch-blocker for trust; 4) real footer hrefs or trim columns; 5) `aria-label` pass.

**Backend contracts:** After fix 1: `GET /store/product-categories`. Depends on seeded category handles (BACKEND_PLAN module 5 — names/handles must stabilize before hardcoding anything).

**Test plan:** Click every header/nav/footer link → no 404s. 375px viewport → all pages navigable. Keyboard-tab through header — every control labeled and reachable.

**Vercel:** None; fully static.

---

## Module 7 — Shared Components, State & Utilities (batched: `components/`, `lib/`, `store/`, `hooks/`, `types/`)

**Responsibility:** `components/ui/button.tsx` (shadcn, **imported nowhere**), `lib/utils.ts` (`cn()`, used only by button), `features/home/components/ProductCard.tsx` (the one genuinely shared component — used by home, shop, PDP). `store/`, `hooks/`, `types/`, `components/shared/` are empty.

**Issues:**
- `ProductCard` lives under `features/home/` but is imported cross-feature (`Shop.tsx:5`, `ProductDetails.tsx:5`) — wrong home; also renders hardcoded 5-star ratings ignoring its `rating` prop (`ProductCard.tsx:34-36`), `$` currency (`:51`), dead Add-to-Cart button (`:58-60`), non-clickable image, default `href="#"`.
- No shared `Product` type — every consumer re-derives shape from `any` with divergent fallbacks (`'1kg'` in 3 places).
- **Unused dependencies:** `zustand`, `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `zod`, `embla-carousel-react`, `framer-motion`, `@base-ui/react`, `tw-animate-css` — zero imports (`package.json:12-29`). Also `shadcn` (the CLI) is in `dependencies`.
- `features/_template/` scaffolding ships in `src`.

**Fixes (priority):** 1) Move `ProductCard` → `components/shared/`, take a typed `product` prop, wrap image in the link, shared price formatter, remove fake ratings until reviews exist; 2) create `src/types/product.ts` from actual store-API response; 3) prune unused deps (move `shadcn` to dev or remove) — smaller install, faster Vercel builds; 4) delete `_template` or move outside `src`.

**Backend contracts:** None directly; types must mirror `/store/products` response shape (verify against live payload, not docs).

**Test plan:** `tsc --noEmit` clean after typing. Card click navigates from all three surfaces. `pnpm build` succeeds after dep prune.

**Vercel:** Dep prune shrinks the build; nothing else.

---

## Module 8 — Build Config & Vercel Deployment (`next.config.ts`, `package.json`, monorepo root)

**Responsibility:** Empty Next config (`next.config.ts:3-5`); Turborepo/pnpm monorepo (`apps/web` + `apps/backend`); build script `next build --turbopack`.

**Issues:**
- `--turbopack` on `build` (`package.json` scripts) — Turbopack production builds are still maturing on Next 15.5; if the Vercel build misbehaves, this is suspect #1.
- Empty config: no `images.remotePatterns` (needed once `next/image` adopted — backend URL + placeholder host), no security headers.
- Monorepo: Vercel project must set **Root Directory = `apps/web`**; pnpm + turbo are auto-detected, but confirm `installCommand` runs at repo root for workspace resolution.
- `.env.production` exists locally, untracked — good, but there's no `.env.template` documenting required vars.
- Backend on GCP Cloud Run (per BACKEND_PLAN): backend `storeCors` must include the Vercel prod + preview URLs (`*.vercel.app` wildcard for previews), or every deploy preview breaks.

**Fixes (priority):** 1) Vercel project config (root dir, env vars `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` for Production+Preview); 2) coordinate `storeCors` with backend; 3) drop `--turbopack` from `build` if CI flakes; 4) add `images.remotePatterns` alongside `next/image` adoption; 5) `.env.template`; 6) basic security headers (`headers()` in config).

**Backend contracts:** CORS config (`medusa-config.ts` per BACKEND_PLAN module 1) and the public `/homepage` route reachability from Vercel serverless (BACKEND_PLAN notes it's outside `storeCors` — raw fetch from server components is unaffected by CORS, but browser calls would be).

**Test plan:** Vercel preview deploy end-to-end against staging backend: homepage CMS content loads, shop lists, PDP renders, no CORS errors in console. Build passes with env vars *unset* in a scratch project → should fail fast (module-1 fix 2), not deploy broken.

**Vercel:** Both env vars are legitimately public. No server-only secrets exist in the frontend today — keep it that way; if admin-key calls are ever needed, do them in a Route Handler with a non-`NEXT_PUBLIC` var.

---

## Recommended Implementation Order

Safest / lowest-risk first:

1. **Dead code & dep prune** — delete `MostLovedProducts` (or wire it), `_template/`, unused deps, `button.tsx` if unwanted. Zero consumers, zero risk. *(Module 7)*
2. **Routing hygiene** — remove duplicate Header/Footer, await `params`, `notFound()` on unknown handle + move `ProductDetails` null-guard, add `loading.tsx`/`error.tsx`/`not-found.tsx`, `Promise.all` home fetches. Isolated, immediately visible wins. *(Modules 2, 4)*
3. **API client hardening** — env fail-fast, typed errors, remove no-op revalidate, real caching strategy, shared `Product` types + currency formatter. Foundation for everything below. *(Modules 1, 7)*
4. **Pricing & variant contract fix** — region/currency context + `calculated_price`, v2 options-array access, single ₹ formatter. Verify against live backend first (breaking-change #6, #7); coordinates with backend seed consolidation. *(Modules 1, 4, 5)*
5. **Navigation & URL state** — `/shop?category=` searchParams state, rewire CategoryNav/Hero/Footer/ShopByCategory links, dynamic CategoryNav, mobile menu, remove fake cart badge/search/dead buttons. Touches many files but all frontend-local. *(Modules 5, 6)*
6. **Honest UI states** — drop BestSellers dummy fallback, fake ratings/reviews/"In Stock", Newsletter form; add empty states; a11y + `next/image`/alt pass (+ `remotePatterns`). *(Modules 3, 7)*
7. **Vercel deployment setup** — project config, env vars, CORS coordination with backend, preview deploy verification, `.env.template`. Do after 1–6 so the first deploy is testable. *(Module 8)*
8. **Coordinated backend pairs, last** — postMessage origin lockdown (#2), envelope normalization (#1), newline convention (#3), `/homepage` → `/store` move (#4), nullability alignment (#5). Each requires an atomic frontend+backend ship; sequence with BACKEND_PLAN step 9. *(Modules 1, 3)*

Deliberately out of scope until decided: cart/checkout (no Medusa cart endpoints consumed anywhere; Add-to-Cart buttons are decorative — either build it as the next feature epic or hide the buttons for launch), auth/account (Header login button is dead UI), search, wishlist, reviews.
