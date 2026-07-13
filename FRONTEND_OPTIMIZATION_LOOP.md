# Frontend Optimization & UI Agent Loop

> Authoritative playbook for the autonomous agent improving the **Mithra Whole
> Foods** storefront (`apps/web`). Goal: make every route feel instant and give
> the store a distinctive, premium UI. Trust the code over older docs; this file
> over older docs. Update the **Progress log** at the bottom as you go.

---

## 1. System prompt (role the agent adopts each iteration)

```
You are a senior frontend performance + product-design engineer working on the
Mithra Whole Foods storefront: a Next.js 15 (App Router, Turbopack, React 19)
Medusa v2 headless commerce frontend in apps/web. The backend is a remote
Medusa instance (Railway) with real network latency and occasional cold starts,
so the frontend MUST NOT block the user on server round-trips — it should feel
instant and reconcile in the background.

Ground truth about the codebase:
- Routes live in apps/web/src/app/[countryCode]/(main|checkout)/.
- Data fetching lives ONLY in apps/web/src/lib/data/*.ts server actions
  (products, cart, regions, customer, ...). Never add inline fetch in a
  component. All product/cart reads already use next `force-cache` + cache tags.
- The cart is already optimistic: apps/web/src/lib/context/cart-context.tsx
  exposes useCart() with an in-memory optimistic cart. Prefer reading client
  cart state over re-fetching the server cart on navigation.
- Navigation uses <LocalizedClientLink> (a next/link wrapper that prefixes the
  country code). next/link prefetch only helps a dynamic route when that route
  has a loading.tsx boundary — otherwise the click blocks on a full server
  render.
- Design tokens: apps/web/src/styles/globals.css. Brand = "Mithra Whole Foods",
  premium India-first grocery, INR. Palette: cream (#faf7f1) background, dark
  gray (#333) text, serif display font. Keep it warm, organic, premium.

Operating rules:
- One coherent change per iteration. Verify it (typecheck/build + browser where
  observable) BEFORE moving on. Never claim a route is faster without evidence.
- Commit each landed, verified improvement with a conventional-commit message.
- Do not touch generated dirs (.next, .medusa, .turbo, node_modules), the
  pnpm lock except via pnpm, or committed migrations.
- Perceived performance (instant skeleton + prefetch) counts as much as wall
  time. Optimize both.
- Preserve behavior: prices need region_id/calculated_price context;
  variant.options is an array; keep existing cache tags working.
```

## 2. The loop

Each iteration:

1. **Pick** the next unblocked item from the current phase backlog (top-down).
2. **Investigate** the relevant files; confirm the assumption still holds.
3. **Implement** the smallest change that achieves the item.
4. **Verify** — the change must be *observed*, not assumed:
   - `pnpm --filter web lint` and a type/`build` check must pass.
   - If observable in the browser, run the dev server and drive the flow
     (navigate the route, watch console/network, screenshot).
5. **Record** — tick the item in the backlog and append to the Progress log.
6. **Commit** with a conventional-commit message once verified.
7. **Evaluate the phase exit criteria.** If met, move to the next phase. If all
   phases done and exit criteria met → **STOP** (goal achieved).

Loop invariant: `main`/branch stays green (build passes) after every commit.

## 3. Phases, backlog & exit criteria

### Phase 1 — Route performance (make every route feel instant)

Root cause found during audit (2026-07-13): `/store` and `/products/[handle]`
have **no `loading.tsx`**, so navigation blocks on a full server render against
the slow backend (the reported 3–4 s). Cart/checkout re-fetch server-side and
run some awaits sequentially.

- [x] **P1.1** Add `loading.tsx` skeletons for `/store`, `/products/[handle]`,
  `/checkout`, `/categories/*`, `/collections/*` (cart already had one) so
  navigation paints an instant skeleton and `next/link` prefetch becomes
  effective. _Done 2026-07-13 — new skeleton templates
  `skeleton-product-page` + `skeleton-store-listing`._
- [x] **P1.2** `<LocalizedClientLink>` uses `next/link` with default prefetch
  (not disabled). With P1.1's loading boundaries in place, prefetch now paints
  the skeleton on hover/viewport. _Verified: no `prefetch={false}` anywhere._
- [x] **P1.3** Parallelize sequential server awaits on hot paths — `cart/page`
  and `checkout/page` now `Promise.all` cart+customer. _Done 2026-07-13._
- [ ] **P1.4** Make the cart page render instantly from the optimistic
  `useCart()` context instead of blocking on a fresh server fetch; reconcile in
  the background.
- [ ] **P1.5** Trim over-fetching: review the `fields` requested by
  `listProducts`/`retrieveCart` on hot paths; drop anything the view doesn't
  render.
- [ ] **P1.6** Verify build-time static generation of PDPs
  (`generateStaticParams`) still works and add `revalidate`/ISR where safe so
  PDPs serve from cache.
- [ ] **P1.7** Add route `prefetch` warming for the primary CTA path
  (home → store → PDP → cart → checkout).

**Exit criteria:** every primary route (home, store, PDP, cart, checkout) paints
meaningful content (skeleton or data) within ~1 s of a click on a warm backend;
no route shows a blank frozen screen on navigation; build passes; changes
committed.

### Phase 2 — UI overhaul (premium, distinctive, on-brand)

Use the **frontend-design** skill for aesthetic direction.

**Reference analysis (2026-07-13, user-provided):**
- **bliss-tree-nj.us** — logo top-left (green tree mark + wordmark), full-width
  search, phone CTA, account/wishlist/cart top-right, then a horizontal
  category nav bar (NEW ARRIVALS / RICE / SWEETS / OILS / ALL PRODUCTS). Green
  organic palette, natural food photography, promo tiles beside the hero. This
  is the header/nav target for Mithra.
- **naturemills.com** — leaf logo, "100% Natural" script badges, food shot on
  light stone backgrounds, clean minimal header, soft palette.
- **shop.cookdtv.com (PDP)** — the product-page target: left image **gallery**
  (large image + storytelling shots: product / ingredients / how-to / benefits);
  right column = title, star rating (x/5 + count), price, **pill** variant
  selectors (Pack Size, Size), quantity stepper, big Add-to-Cart, delivery
  countdown + order timeline (Purchased→Processing→Delivered); then related-
  product rail, customer reviews, FAQs.

**Brand:** Mithra's own tree/leaf logo motif; palette = cream `#faf7f1` +
forest green `#2E5C31` + earthy accents; serif display (`--font-display`).
Logo file provided by user at `apps/web/public/` (wire `/logo.png` with a text
wordmark fallback until it lands).

- [x] **P2.1** Header/logo: **logo top-left** (`Logo` component — serif
  wordmark + leaf mark, auto-swaps to `public/logo.png` when provided); clean
  two-row header (logo · Home/Shop · Account/Cart, then a `CategoryBar`).
  Desktop slide-out "Menu" removed; hamburger kept for mobile only. Removed the
  now-dead homepage `CategoryNav`. _Done 2026-07-13, verified desktop+mobile._
- [x] **P2.2** Removed the left "Sort by" sidebar on `/store`, `/categories/*`,
  `/collections/*`. `RefinementList` is now a compact top-bar sort dropdown;
  templates use a serif title + subtitle header row with the grid full-width.
  Store loading skeleton updated to match. _Done 2026-07-13, verified._
- [ ] **P2.3** Cart page + cart dropdown: fix the background/contrast, spacing,
  and empty state to match the premium brand.
- [ ] **P2.4** Global polish: typography scale, spacing, buttons, product cards,
  hover/transitions, dark-mode-safe where the design commits to it.
- [x] **P2.5** Product image **carousel** — new `ProductGallery` renders every
  image on the product (upload as many as you like: product shot, ingredients,
  nutrition, "about") as a swipeable gallery with large main image, prev/next
  arrows, thumbnail strip, and dot indicators. Replaced the old single
  background-image on the PDP. Added `images.unsplash.com` to `next.config`
  remotePatterns (product images now go through next/image). _Done 2026-07-13;
  verified end-to-end with 4 real images — thumbnail click swaps main image +
  active dot/thumb._
- [ ] **P2.6** **Admin**: allow uploading/ordering multiple images per product
  (grouped: main / about / ingredients) so the PDP carousel is content-driven.
  (Medusa admin already supports multiple product images + variant images;
  extend/verify the flow and PDP consumption.)

**Exit criteria:** logo top-left; no accidental left sidebar; cart visually
consistent; PDP shows a multi-image carousel fed by product data; admin can
manage those images; build passes; changes committed; user signs off on the
look.

## 4. Verification toolbox

- Type/build: `pnpm --filter web build` (or `tsc --noEmit`) + `pnpm --filter web lint`.
- Browser: run the web dev server via the preview tool, navigate the flow, read
  console/network, screenshot. Never ask the user to check manually.
- Perf signal: watch for blank-screen-on-nav (missing skeleton), waterfalls in
  the network panel, and RSC payload timing.

## 5. Constraints

- Business logic stays in Medusa; web only renders + fetches via `lib/data/*`.
- Keep `region_id`/`calculated_price` context on price reads.
- No secrets in tracked files.
- Don't break existing cache tags / revalidation.

## 6. Progress log

_(append newest-last; one line per landed change)_

- 2026-07-13 — Audit complete; loop authored. Root cause of slow nav: missing
  `loading.tsx` on `/store` and `/products/[handle]`. Starting Phase 1.
- 2026-07-13 — P1.1/P1.2/P1.3 landed. Added instant loading skeletons for
  store/PDP/checkout/categories/collections; parallelized cart+customer fetches
  on cart & checkout. Verified: `pnpm typecheck` green; store + PDP render
  correctly against local backend (58 products, region USA/us). Perceived
  navigation now paints a skeleton immediately instead of a 3–4 s blank screen.
