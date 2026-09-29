# Frontend Performance & Local-First Audit — 2026-08-01

**Scope:** `apps/web` (medusa-next storefront) + the backend surfaces it depends on.
**Method:** static read of every route, data helper and mutation path, plus one
read-only run of `apps/backend/src/scripts/diagnose-fulfillment.ts` against the
live Neon DB for ground truth.
**Status:** analysis only. No application code was changed.

Everything below cites `file:line`. Where a claim is inferred rather than
directly observed, it says so.

---

## 0. TL;DR — why routes feel like they "wait for the backend"

There are **five** independent causes, and they compound. In rough order of
impact:

| # | Cause | Effect |
|---|---|---|
| 1 | `router.refresh()` after **every** cart mutation | Wipes the entire client Router Cache, so the *next* click on any link is a cold server round-trip. Also re-runs the `(main)` layout = 4–5 extra backend calls per add-to-cart. |
| 2 | No `experimental.staleTimes` in `next.config.js` | Next 15 defaults dynamic-page staleTime to **0**. Prefetched payloads are discarded immediately; every navigation refetches. |
| 3 | `(main)` layout is a blocking 2-stage waterfall | Nothing streams until 4 parallel calls **then** a 5th sequential call finish. Wraps every page in the group. |
| 4 | PDP fires `router.replace()` on mount | Every product page load triggers a second full server render before the shopper has done anything. |
| 5 | Store listing fetches 100 products to show 12 | Largest single payload on the site, re-fetched on every sort/filter/page click. |

Causes 1–2 are why *clicking a link* stalls. Causes 3–5 are why the thing you
land on then takes a while to draw.

---

## 1. The `router.refresh()` problem (highest impact)

`apps/web/src/lib/context/cart-context.tsx:151`

```ts
const refreshAfterMutation = useCallback(() => router.refresh(), [router])
```

Called unconditionally after every `addItem` / `updateItem` / `deleteItem`
(`:173`, `:189`, `:205`).

The in-file comment (`:134-150`) is an honest and correct description of the bug
it was written to fix: a mid-flight navigation could land a pre-mutation cart in
the client Router Cache. But the chosen remedy is the largest hammer available,
and it has two costs the comment does not account for:

**Cost A — it destroys prefetch.** `router.refresh()` invalidates the whole
client Router Cache, not just the cart. Every route the shopper had prefetched
(nav "Home"/"Shop" at `modules/layout/templates/nav/index.tsx:58,66`, the hero
CTA at `modules/home/components/hero/client.tsx:55`) is discarded. The very
moment a shopper is most likely to navigate — right after adding to cart — is
exactly when navigation is guaranteed to be cold.

**Cost B — it re-runs the `(main)` layout.** `router.refresh()` refetches the
RSC payload for the current route *including its layouts*. That layout
(§3 below) makes 4–5 backend calls. So:

```
1 add-to-cart click
  → 1 POST /store/carts/:id/line-items
  → router.refresh()
      → GET /store/customers/me
      → GET /store/carts/:id
      → GET /homepage
      → GET /store/shipping-options
      → GET /store/regions, /store/product-categories (via <Nav>)
```

**≈ 6–7 backend requests per add-to-cart.**

### Why that number is dangerous here

`apps/backend/src/api/middlewares.ts:16-23` rate-limits `/store/*` to **150
req/min keyed by client IP**. Because the storefront is server-rendered, every
shopper shares the Next server's IP — this is a *site-wide* ceiling, not
per-user (already recorded in memory as a known structural flaw).

At ~6.5 store requests per add-to-cart, the cart mutation budget for the entire
site is roughly **23 add-to-cart actions per minute**, before counting page
views. This is the single most likely cause of intermittent "cart vanished" /
"site is slow" reports under any real concurrent load.

### Direction (not applied)

The original race is real and must not be reintroduced. The narrower fixes,
roughly in order of preference:

1. Have the cart server actions return the authoritative cart, and reconcile
   into a client cart store — no `router.refresh()` at all. This is the true
   "local-first" shape: the client owns cart state, the server is the sync
   target.
2. If a refresh must stay, make it conditional on the cart actually being
   *rendered* by a server component on the current route (cart page, checkout),
   and rely on the optimistic context everywhere else.
3. Split the layout so `retrieveCart()` is not on the critical path of a refresh
   (see §3).

---

## 2. Client Router Cache is effectively disabled

`apps/web/next.config.js` sets `reactStrictMode`, `logging`, and `images`. There
is **no `experimental.staleTimes`**.

In Next.js 15 the Client Router Cache default changed to uncached: `staleTimes.dynamic`
is **0**. Since every route in this app is dynamic (§3), a prefetched RSC payload
is considered stale the instant it lands. Prefetch still costs the backend a
request; the shopper gets none of the benefit.

Note the code has already *noticed* the symptom without naming the cause —
`nav/index.tsx:49-55`:

> "Every route reads cookies, so it renders dynamically and Link's default
> prefetch only reaches the loading skeleton."

That is accurate for `prefetch={undefined}`. The team's workaround was
`prefetch` (full prefetch) on two links. With `staleTimes.dynamic: 0`, even
those full prefetches are discarded before use.

**Direction:** set `experimental.staleTimes: { dynamic: 30, static: 180 }` and
measure. This is a config-level change with a large blast radius on perceived
speed — it should land with §1, not before it (with `router.refresh()` still in
place, a longer staleTime is repeatedly thrown away anyway).

---

## 3. The `(main)` layout is a blocking waterfall on every page

`apps/web/src/app/[countryCode]/(main)/layout.tsx:24-36`

```ts
const [customer, cart, homepageSettings, welcomeDismissed] =
  await Promise.all([ retrieveCustomer(), retrieveCart(),
                      getHomepageSettings(), hasDismissedWelcomePrompt() ])
let shippingOptions = []
if (cart) {
  const { shipping_options } = await listCartOptions()   // ← 2nd wave
  shippingOptions = shipping_options
}
```

Three problems:

1. **Sequential second wave.** `listCartOptions()` only needs `cart.id`, which
   the cookie already holds — it does not need to wait for the full
   `retrieveCart()` response. This is an avoidable serial hop.
2. **No Suspense boundary.** The whole layout — and therefore the whole page —
   is blocked until all of it resolves. `<Nav>` is `async` too
   (`modules/layout/templates/nav/index.tsx:17-23`, another 4 parallel calls) and
   only `<CartButton>` is wrapped in Suspense (`:96`). Header, category bar,
   footer and page content all wait on the slowest call.
3. **It forces the entire app dynamic.** `retrieveCustomer()` and
   `retrieveCart()` read cookies. That opts every route in `(main)` into dynamic
   rendering — which is why `generateStaticParams` on the PDP
   (`app/[countryCode]/(main)/products/[handle]/page.tsx:20-58`) does not
   actually produce static pages. It enumerates handles at build time and then
   renders them dynamically at request time anyway. That work is currently
   buying nothing.

   **Confirmed by a production build on 2026-08-01.** This one is worth showing,
   because the build output actively misleads you. `next build` reports:

   ```
   ● /[countryCode]/products/[handle]     8.6 kB     574 kB
   ├   ├ /us/products/wood-pressed-groundnut-oil
   ├   └ [+54 more paths]
   ●  (SSG)  prerendered as static HTML (uses generateStaticParams)
   ```

   That reads as "57 product pages were prerendered." They were not:

   ```
   $ find .next/server/app -path "*products*" -name "*.html" | wc -l
   0
   $ node -e "console.log(Object.keys(require('./.next/prerender-manifest.json').routes))"
   [ '/twitter-image.jpg', '/opengraph-image.jpg', '/_not-found' ]
   ```

   **Zero product pages on disk.** Three prerendered routes in the whole app,
   none of them a product. The `●` marker only means the route *declares*
   `generateStaticParams`; the `cookies()` call in the layout then forces
   dynamic rendering and nothing is written. So the build pays to enumerate 57
   handles from the backend, labels them SSG, and produces nothing — and anyone
   reading the build log concludes the catalog is static when every request is
   a cold server render. Same for `categories/[...category]` (17 paths listed)
   and `collections/[handle]`.

**Direction:** push the personalised reads (`customer`, `cart`) behind Suspense
boundaries so the static shell (nav chrome, category bar, footer, page body)
streams immediately; let the cart badge and welcome prompt fill in. That single
change is what makes PPR/static shells possible later.

---

## 4. Product detail page self-navigates on mount

`apps/web/src/modules/products/components/product-actions/index.tsx:91-106`

```ts
useEffect(() => {
  const params = new URLSearchParams(searchParams.toString())
  const value = isValidVariant ? selectedVariant?.id : null
  if (params.get("v_id") === value) return
  if (value) params.set("v_id", value)
  else params.delete("v_id")
  router.replace(pathname + "?" + params.toString())
}, [selectedVariant, isValidVariant])
```

The PDP reads `searchParams.v_id` server-side
(`products/[handle]/page.tsx:118-131`) to pick variant images. So this
`router.replace` is **a full server round-trip**, not a client-only URL rewrite.

Because `options` is pre-seeded for single-variant products (`:38-45`), the
guard at `:96` fails on first render for every single-variant product — the URL
has no `v_id`, the resolved variant does. **Every single-variant PDP load
triggers an immediate second render of the page on the server.** Most of this
catalog is single-variant.

Secondary: no `{ scroll: false }`, unlike the checkout equivalents
(`checkout/components/shipping/index.tsx:122`).

**Direction:** either resolve `v_id` server-side so the first render is already
correct, or keep variant selection purely client-side (the images are already in
the payload — `getImagesForVariant` is a pure filter over `product.images` and
does not need the server).

---

## 5. Store listing over-fetches by ~8×

`apps/web/src/lib/data/products.ts:105-133` — `listProductsWithSort`:

```ts
const { response: { products, count } } = await listProducts({
  pageParam: 0,
  queryParams: { ...queryParams, limit: 100 },   // :115
  countryCode,
})
const sortedProducts = sortProducts(products, sortBy)
const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit) // :126
```

Fetches **100 products** with `*variants.calculated_price`, `*variants.options`,
`*variants.images`, `+tags`, `+metadata` (`:64-66`) to display 12. Sorting is
done in JS because Medusa can't sort by calculated price server-side — a real
constraint, but the current shape has two consequences:

- Every store page view, every sort change, every category click, every
  pagination click re-fetches that 100-product payload.
- `count` comes from the 100-item query while `slice` paginates a 100-item
  window — **pagination past product 100 silently returns empty pages** while
  the pager still renders page numbers for the full count. This is a
  correctness bug, not just perf. Currently masked because the catalog is ~54
  products; it breaks the moment the catalog crosses 100.

Related: `lib/data/categories.ts:17-19` requests `*products` for **all**
categories with `limit: 100`. That expands full product objects per category.
It's called from `<Nav>` (every page), `StoreTemplate:26`, and the homepage —
so the same heavy payload is fetched 2–3× per page render, only to compute
category counts.

**Measured directly against the backend on 2026-08-02** (warm, localhost, zero
network hop — so this is pure backend + DB time, nothing added by any frontend
or network topology):

```
GET /store/regions                                          ~0.9–1.1s
GET /store/product-categories?limit=100                     ~0.9s
GET /store/products?limit=12&fields=…calculated_price…      ~4.7–4.9s
GET /store/products?limit=100&fields=…calculated_price…     ~5.9–10.9s
```

For comparison, a raw round-trip to the same Neon database — one query, no
Medusa in between — is a **consistent ~220ms**:

```
$ node -e "new pg.Client(...).query('SELECT 1')"
connect: 1653ms   (one-time TLS handshake)
SELECT 1:          221ms
SELECT 1 (warm):    218ms
SELECT count(*) FROM product:          218ms
SELECT count(*) FROM product_variant:  218ms
```

A `/store/products` call costing 20–45× a single round-trip strongly suggests
the `calculated_price` resolution is doing one query per variant (or per
price) rather than one batched query — a classic N+1 pattern, consistent with
known behaviour in Medusa's pricing module when calculated prices are
requested per-variant. This has **not** been traced into Medusa's internals to
confirm the exact query count; that would be the next step before attempting a
fix.

**This is the single largest number in this entire audit.** Every other
finding here — the `router.refresh()` waterfall, the missing `staleTimes`, the
PDP double-render — measures in tens or hundreds of milliseconds. This one
measures in **seconds**, on every store page load, every sort, every filter
change, because §5 already established the full 100-product payload is
re-fetched on each of those. It is very likely the dominant contributor to
"the site feels slow," ahead of everything else combined.

**Direction:** ask the backend for counts (or a `fields=id` projection) instead
of full product objects; move price sorting behind a backend endpoint that can
paginate properly.

---

## 6. Local-first / optimistic UI coverage

The cart is genuinely local-first and well built. Almost nothing else is.

| Interaction | Optimistic? | Where | Notes |
|---|---|---|---|
| Add to cart (PDP) | ✅ | `product-actions/index.tsx:145` | via `useCart().addItem` |
| Add to cart (card) | ✅ | `product-preview/add-to-cart-button.tsx:57` | + inline qty stepper |
| Update qty / remove | ✅ | `cart-context.tsx:182,198` | rollback + toast |
| Wishlist toggle | ⚠️ partial | `wishlist-heart.tsx:36` | flips locally, but persists to **customer metadata** via `updateCustomer` — a full customer write per heart click. No batching, no debounce. |
| Sort / filter / paginate | ❌ | `refinement-list/index.tsx:39`, `pagination/index.tsx:27` | `router.push` → full server round-trip, no pending state, no skeleton on the control itself |
| Search | ❌ | `search-bar/index.tsx:27` | full navigation; no typeahead, no suggestions, no debounced client results |
| Checkout step change | ❌ | `checkout/components/shipping/index.tsx:122,126`, `payment/index.tsx:68` | each step is a `router.push` on a dynamic route = full re-fetch of cart + customer |
| Login / register | ❌ | `account/components/login/index.tsx` | `useActionState`, server round-trip (correct for auth) |
| Address CRUD | ❌ | `account/components/address-card/*` | `useActionState` |
| Review submit | ❌ | `products/components/reviews/review-form.tsx` | `useActionState`; approve-first anyway, so optimistic display would be misleading |

**Reading:** the *hard* case (cart) was solved properly. The remaining latency
the user feels is concentrated in the un-optimised **navigation** paths — sort,
filter, paginate, checkout steps — where a click produces no feedback at all
until the server answers.

Note `refinement-list` and `pagination` don't even wrap their `router.push` in
`useTransition`, so there is no `isPending` to drive a spinner. The store
template does key a `<Suspense>` on `category/sort/page`
(`store/templates/index.tsx:112`), which gives a grid skeleton — but only after
the server has responded with the new shell.

---

## 7. Caching correctness

`lib/data/cookies.ts:22-34` — `getCacheTag()` builds tags as
`` `${tag}-${cacheId}` `` where `cacheId` is `_medusa_cache_id`, a **random
per-browser UUID** set in `middleware.ts:113`.

The Next Data Cache is keyed by request URL, so two browsers hitting
`/store/products?…` share one cache entry — tagged with whichever browser
populated it first. A `revalidateTag("products-<uuid-A>")` therefore cannot
reliably purge an entry tagged `products-<uuid-B>`.

The codebase already diagnosed this for the cart and fixed it correctly by
tagging with the **cart id** instead (`cookies.ts:47-63` — good comment, right
call). The same flaw is still live for `products`, `categories`, `regions`,
`customers`, `orders`, `fulfillment`.

Partially mitigated: `apps/backend/src/subscribers/catalog-changed.ts:35` calls
`revalidateStorefront("/", "layout")`, which is path-based and does work. So
catalog edits do reach the storefront — but via a blunt whole-layout purge, not
the tag system the data layer thinks it's using.

**Other cache notes:**

- `lib/data/regions.ts:38` — module-scope `regionMap` `Map` in a `"use server"`
  file. Persists for the life of the Node process, never expires. Region changes
  require a redeploy. Low impact today (one region), a trap later.
- `lib/data/search.ts` docstring says "Meilisearch-backed". Meilisearch was
  removed in `e0e2847`; search is the in-process engine at
  `apps/backend/src/lib/product-search.ts`. Comment is stale.
- That in-process index is **per-instance and in-memory**
  (`product-search.ts:1-12`). `invalidateSearchIndex()` from a subscriber only
  clears the instance that handled the event. On multi-instance Railway,
  instances will disagree about search results until each rebuilds.

---

## 8. Error handling

`CLAUDE.md` already flags this; it is still true and worth quantifying.

Helpers that swallow and return `null`/`[]`, turning a backend outage into a
silently empty page rather than an error state:

- `cart.ts:72` — `.catch(() => null)`
- `regions.ts:65` — `catch { return null }`
- `search.ts:37` — `catch { return { productIds: [], count: 0 } }`
- `nav/index.tsx:22` — `listCategories().catch(() => [])`
- `store/templates/index.tsx:26` — same
- `page.tsx:32-35` (home) — `listProducts(...).catch(...)` returns empty

Consequence: if the backend is rate-limited (§1) or briefly down, the
storefront renders a **structurally valid, completely empty store**. No error
boundary fires, `error.tsx` never runs, and nothing is reported. This is the
worst possible failure mode for a shop, and it is the one most likely to
actually occur given the rate-limit maths in §1.

---

## 9. Assorted

- **`@vercel/analytics` is the only instrumentation** (`app/layout.tsx:17,24`).
  Page views only. No commerce events at all — see the roadmap doc.
- **Images:** `next.config.js` is in good shape (AVIF/WebP, `qualities`
  allow-list, 24h `minimumCacheTTL`). The 25 MB hero problem recorded in memory
  appears addressed at the config level.
- **Dead code path:** checkout renders a pickup branch
  (`checkout/components/shipping/index.tsx:86-91`) but the live DB has **no
  pickup fulfillment set** (§ shipping research). That UI can never appear.
- **`generateStaticParams` on the PDP** is currently inert (§3).
- **No web tests.** `apps/web` has no test setup; backend has unit +
  integration. Any perf work here is currently unguarded by regression tests.

---

## 9b. Should the frontend move onto the same Railway server as the backend?

**Asked directly on 2026-08-02. Short answer: no — it targets the wrong hop.**

The proposal would remove the network hop between Vercel (frontend) and
Railway (backend). Measure what that hop actually costs versus what's
measured in §9:

- A Vercel→Railway request adds a network round-trip, typically **tens of
  milliseconds** for two well-connected cloud regions in the US.
- The `/store/products` call the frontend is waiting on takes **4.7–10.9
  seconds** on the backend itself, before any frontend is involved at all.

Co-locating the two would save, generously, 1–2% of the wait on the slowest
requests. It would not be measurable against the seconds-scale cost in §9.

**It would also cost something real:**

- Next.js on Vercel gets edge/CDN delivery for static assets, automatic image
  optimization (already configured — AVIF/WebP, `qualities` allow-list), and
  serverless scaling per-region. A single Railway container serving both apps
  gives up all of that for no measured benefit.
- Coupled deploys: today a storefront-only change (say, a copy fix) redeploys
  independently of the backend. On one server, every deploy risks both, and a
  backend crash takes the storefront down with it — the opposite of
  resilience.
- Database geography doesn't change either way: Neon is in `us-east-1`
  regardless of where the backend container runs, and §9's numbers already
  include whatever network path this backend currently uses to reach it.

**What to do instead:** fix what's actually slow — the query pattern behind
`/store/products`. That is real backend engineering work (tracing the
calculated-price query path, likely batching a per-variant N+1 into one
query), not something I've done yet — the measurement above is diagnosis, not
a fix. Happy to take it on next if you want it; it's a different subsystem
than the retry/analytics work in this session, so flagging it rather than
just starting.

## 10. Suggested ordering (if/when work is approved)

Sequenced so each step is measurable and nothing depends on an unlanded step.

**P0 — latency and load (do together, they interact)**
1. Replace unconditional `router.refresh()` with cart reconciliation from the
   action's return value (§1).
2. Add `experimental.staleTimes` (§2).
3. Suspense-wrap the personalised reads in `(main)/layout.tsx`; parallelise
   `listCartOptions` (§3).
4. Remove the PDP mount-time `router.replace` (§4).

*Expected: ~6.5 → ~1 backend request per add-to-cart; instant nav on prefetched
routes; first paint no longer blocked on customer/cart.*

**P1 — correctness**
5. Fix pagination beyond 100 products (§5) — this is a real bug on a growing
   catalog.
6. Fix cache tag keying for products/categories/regions (§7).
7. Surface errors instead of returning empty (§8) — at minimum for the store
   grid and PDP.

**P2 — perceived speed**
8. `useTransition` + pending states on sort/filter/paginate (§6).
9. Client-side search suggestions.
10. Trim `listCategories` to counts (§5).

**P3 — structural**
11. Static shell / PPR for the catalog once the layout is Suspense-split.
12. Replace the IP-keyed store rate limit with something session-aware
    (pre-existing known flaw — do not just raise the number).

---

*Verified against the repo and the live Neon DB on 2026-08-01. Trust the code
over this document; re-verify before acting on any line item.*
