# Why manvaasam.in feels instant and Mithra doesn't — measured comparison + fix plan

**Date:** 2026-08-06
**Method:** direct HTTP measurement, real-browser Navigation/Resource Timing, and
JS bundle inspection of both sites. Every number below was measured today from
the same machine on the same connection, not estimated.

---

## 0. The short version

Four findings, in order of how much they cost you:

1. **Almost none of your optimization work is live.** 44 modified files and 88
   untracked files are sitting uncommitted in the working tree. Every branch's
   last commit is **2026-07-30**. The Cloudinary image fix, `resilient-fetch`,
   the health probe, the observability pipeline — all written, none deployed.
   The site you are judging as slow is running pre-optimization code.
2. **The homepage ships 21 MB.** Nine untransformed Cloudinary PNGs at ~2.3 MB
   each. The fix for this is already written and already proves a **2,370 KB →
   63 KB** reduction. It is in the uncommitted pile.
3. **Your backend and your database are on opposite sides of the planet.** One
   trivial database round trip costs **~290 ms** (should be 1–3 ms). Medusa's
   product query makes ~7 of them, which is the entire 2.25 s. This is a new
   finding and it **corrects** the "N+1 in price resolution" hypothesis in
   `AUDIT_2026-08-01_FRONTEND_PERF.md` §9.
4. **Every click is a server round trip.** Their navigation is zero-network.
   Yours re-renders on the server every time and is explicitly marked
   uncacheable.

And the punchline that reframes the whole thing:

> **Their backend is slower than yours.** `api.manvaasam.in/api/products` takes
> **1.36 s**. Your `/store/products` takes **2.25 s** — same order of magnitude.
> They just never make the user wait for it. The gap you are feeling is not
> backend speed. It is *what blocks the first paint*.

---

## 1. What manvaasam.in actually is

| Layer | What they run | Evidence |
|---|---|---|
| Frontend | **Vite + React SPA** (client-rendered) | `<script type="module" crossorigin src="/assets/index-BZZ8RGOC.js">`, single `<div id="root">`, Vite's content-hash asset naming |
| Hosting | **AWS S3 + CloudFront CDN** | `server: AmazonS3`, `via: … cloudfront.net`, `x-cache: RefreshHit from cloudfront`, POP `MAA50` (Chennai) |
| Routing | SPA catch-all | `/manifest.json` returns `index.html` |
| Backend | **Custom JSON API behind nginx** at `api.manvaasam.in` | `Server: nginx/1.30.3`, endpoints `/api/products`, `/api/categories`, `/api/banners`, `/api/reviews`, `/api/settings`, `/api/flavour-feeds`, plus an `/admin` panel |
| Media | Cloudinary, **with transforms** | `…/video/upload/f_mp4,q_auto/…` |
| Cart | **Client-side only** (localStorage) | Add-to-cart fires no network request; only localStorage key is `manvasam-offer-ticker` |
| Catalog size | **5 products** | Full `/shop` listing |

### An honest caveat before you compare

Manvaasam is a **5-product brochure site with a client-side cart**. Mithra is a
real commerce platform: ~54 products, 21 categories, variants, regions, priced
carts, customer accounts, Stripe checkout, order history, search, wishlist,
reviews, invoices. Their CORS header still allows `http://localhost:5173` in
production — this is not a more sophisticated build than yours.

So do not read this as "they built it better." Read it as: **they made
architectural choices that put speed first, and several of those choices you can
adopt without giving up anything you need.** That is the useful part, and it is
worth a lot.

---

## 2. Measured, side by side

Real browser, same machine, same connection, homepage:

| Metric | manvaasam.in | Mithra (live) | Gap |
|---|---|---|---|
| TTFB | **52 ms** | 98 ms warm · 850–900 ms uncached · **7.1 s cold** | up to 136× |
| DOMContentLoaded | **234 ms** | 1,251 ms | 5.3× |
| Load complete | **236 ms** | **4,257 ms** | 18× |
| Total transferred | **2.1 MB** | **21.1 MB** | **10×** |
| Requests | 20 | 41 | 2× |
| HTML shell | **1 KB** static | 218 KB, `no-store` | 218× |

Backend endpoints, measured directly:

| Endpoint | TTFB |
|---|---|
| `api.manvaasam.in/api/products` | 1.36 s |
| `api.manvaasam.in/api/categories` | 1.08 s |
| **Mithra** `/store/products?limit=12` + `calculated_price` | **2.25 s** |
| **Mithra** `/store/products?limit=100` + `calculated_price` | **2.41 s** |
| **Mithra** `/store/regions` (1 row) | 0.62 s |
| **Mithra** `/health` (no DB) | 0.31 s |

Neither backend is fast. Only one of them is on the critical path.

---

## 3. Why theirs feels instant — five mechanisms

**1. The first paint depends on nothing.** A 1 KB static HTML shell sits on a
CloudFront edge node in Chennai. It arrives in ~52 ms and renders the header,
nav and layout immediately. No server render, no database, no API.

**2. Data loads *after* paint, in parallel.** Six API calls
(`/api/settings`, `/api/products`, `/api/banners`, `/api/categories`,
`/api/reviews`, `/api/flavour-feeds`) fire together from the browser once the
shell is up. Their 1.36 s product call happens while you are already looking at
a rendered page. You never experience it as waiting.

**3. Route chunks are prefetched on first load.** `ShopPage`, `StoryPage`,
`ContactPage` and `PolicyPage` are all downloaded during the initial load. When
you click "Shop", **there is no network request at all** — it is a local React
render. This is exactly the "I don't even feel the delay" you described.

**4. The cart never touches a server.** Add-to-cart writes to localStorage and
re-renders. Zero latency by construction. Opening the cart is a client-side
route change into data already in memory.

**5. Media is disciplined.** 2.1 MB total, Cloudinary transforms applied
(`q_auto`), most icons inlined as base64 data URIs.

---

## 4. Why yours is slow — four root causes, ranked, with evidence

### Cause #1 — the optimizations are not deployed *(biggest, and free to fix)*

```
44 modified files, 88 untracked files, ~2,055 insertions — all uncommitted
Last commit on main / dev / staging / origin: all 2026-07-30
Railway is serving deploy 4496edbf (2026-07-30)
```

Uncommitted and therefore **not live**: `lib/util/cloudinary.ts` (the image fix),
`lib/util/resilient-fetch.ts`, `app/health/route.ts`, the whole
`lib/observability/` and `lib/analytics/` pipeline, the Sentry configs, the
Vitest suite, and the edits to `offer-cards.tsx`, `category-tiles.tsx`,
`promo-cards.tsx` that actually *call* the image fix.

This is the literal answer to "we made many optimizations but it is not working."
The work is real, it is good, and it is on your laptop.

### Cause #2 — 21 MB homepage *(largest user-visible win)*

Nine Cloudinary images served with **no transformation segment** — raw originals,
painted as CSS `background-image`, so `next/image` never sees them and nothing in
`next.config.js` applies.

Measured on your live asset `11f9b16a-…png.png`:

| URL | Bytes | Format |
|---|---|---|
| as served today | **2,370,263** | PNG |
| `f_auto,q_auto` | 189,674 | WebP |
| `f_auto,q_auto,w_1600` | 162,032 | WebP |
| **`f_auto,q_auto,w_800`** | **63,102** | WebP |

**37× smaller.** Across nine images that is ~21 MB → well under 1 MB. On a phone
on mobile data — which is most of your customers — this is the difference
between a page that appears and a page that crawls in.

`apps/web/src/lib/util/cloudinary.ts` already does exactly this and is already
wired into the three components. It has never been deployed.

### Cause #3 — the backend and the database are ~15,000 km apart *(new finding)*

Isolate the database cost by subtracting a route that touches no database:

```
/health        (no DB)                    0.31 s   ← network + app baseline
/store/regions (one 1-row table)          0.62 s
                                          ------
delta = ONE database round trip          ~0.29 s
```

**290 ms for a single query against a one-row table.** A same-region app→DB round
trip is 1–3 ms. This is ~100× the normal cost, and it is pure geography:

- **Neon database region: `us-east-1`** (AWS N. Virginia) — from the connection host
- **Railway edge: `sin1`** (Singapore) — `x-railway-edge` response header

Now the product query falls out exactly:

```
/store/products  2.25 s − 0.31 s baseline = 1.94 s ÷ 0.29 s ≈ 7 round trips
```

Seven sequential queries is **completely normal** for Medusa loading products,
variants, prices, price rules, inventory, options and images. The queries are not
the bug. **Paying 290 ms for each one is.**

Two corrections this forces:

- **`AUDIT_2026-08-01_FRONTEND_PERF.md` §9 attributes this to a per-variant N+1
  in price resolution. The evidence says otherwise.** `limit=12` costs 2.25 s and
  `limit=100` costs 2.41 s — **nearly flat**. A per-variant N+1 would scale with
  product count. This is a fixed number of round trips over a very slow link.
- **§9b says "do not fix this by changing deployment topology."** That
  conclusion was about the **Vercel ↔ Railway** hop, and it remains correct.
  This is a *different* link — **Railway ↔ Neon** — and it was never measured.
  Moving the backend into `us-east-1` should take that 290 ms to single-digit
  milliseconds and the product query from **2.25 s to roughly 0.35 s**, with no
  code change at all.

For completeness, the full request path for an Indian shopper today:

```
Shopper (India) → Vercel edge bom1 (Mumbai) → Vercel function iad1 (Virginia)
   → Railway backend (far from Virginia) → Neon us-east-1 (Virginia) → back
```

The data crosses an ocean, comes back, and crosses again — per query.

### Cause #4 — every click is a server round trip

- `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` on
  every HTML response. **Nothing is ever cached, anywhere**, by design.
- Every route is dynamic because `(main)/layout.tsx` reads cookies, so
  `generateStaticParams` on the PDP is inert and prefetched payloads are
  discarded (`staleTimes.dynamic: 0`).
- `cart-context.tsx:151` fires `router.refresh()` after every cart mutation —
  ~6.5 `/store/*` calls per add-to-cart.
- `listProductsWithSort` fetches 100 products to render 12, and paginates a
  100-item window — **pagination past product 100 silently returns empty pages**.
- Cold Vercel function + cold Railway container = the **7.1 s** first hit. Your
  Railway service has no traffic, so a real visitor lands on a cold start often.

Their equivalent of all four: a static file and a localStorage write.

---

## 5. The plan

Ordered by (impact ÷ effort). Do them in this order — later items are wasted
while earlier ones are outstanding.

### Phase 0 — deploy what you already built *(hours, no new code)*

**0.1 — Get the working tree committed and shipped.** Review the 44 + 88 files,
split into sensible conventional commits, push, verify the deploy. Nothing below
matters until the live site is running current code.

**0.2 — Verify the image fix landed.** After deploy, confirm the homepage
transfers under ~2 MB instead of 21 MB. Expected on its own: **load 4.3 s → well
under 1.5 s.**

**0.3 — Set `STOREFRONT_PROXY_SECRET`.** Costs nothing, converts the `/store/*`
rate limit from a site-wide ceiling into a real per-shopper limit.

### Phase 1 — fix the geography *(a config change; the single biggest backend win)*

**1.1 — Put the backend in the same region as the database.** Either move the
Railway service to a US-East region, or move the Neon project to match the
backend. **Same-region is the requirement**, not a preference.
Expected: `/store/products` **2.25 s → ~0.35 s**; `/store/regions` **0.62 s → ~0.32 s**.

**1.2 — Then decide where the whole stack should live.** Vercel functions are in
`iad1` (Virginia) and your customers are in the US (one region, USA/USD), so
US-East is the right home for all three. Do **not** relocate the frontend to
"be near the backend" — §9b already ruled that out and it is still right.

**1.3 — Re-measure before doing anything else.** If `/store/products` is ~0.35 s,
the "N+1" item can be closed. If it is still seconds, *then* go hunting inside
Medusa — with a fast link, a real N+1 would finally be visible.

### Phase 2 — stop blocking the first paint *(the thing that actually makes it feel like theirs)*

This is where you adopt their architecture without becoming a brochure site.

**2.1 — Make the shell cacheable.** The `no-store` on every HTML response is the
root of "every click waits." Move the cookie reads out of `(main)/layout.tsx` so
routes are no longer forced dynamic; render the shell (nav, footer, categories,
hero) statically and hydrate customer/cart state client-side. That single change
is what lets a CDN answer instantly, exactly as CloudFront does for them.

**2.2 — Set `experimental.staleTimes` in `next.config.js`.** With
`staleTimes.dynamic: 0`, Next throws away every prefetched payload before it can
be used. Prefetching is currently doing work for nothing.

**2.3 — Remove the unconditional `router.refresh()`** at `cart-context.tsx:151`.
The optimistic cart already updates the UI; the refresh only pays for ~6.5
backend calls and wipes the entire client Router Cache, destroying every
prefetch. This is why add-to-cart feels heavy where theirs is instant.

**2.4 — Give every interaction a pending state.** Optimistic UI exists for the
cart and nothing else — sort, filter, paginate, search and checkout steps have no
feedback at all. Perceived speed is largely "did it acknowledge my click within
100 ms." This is cheap and it is a big share of the feeling you are chasing.

**2.5 — Fix `listProductsWithSort`.** Stop fetching 100 to render 12, and fix the
silent empty-page bug past product 100 before the catalog grows.

### Phase 3 — keep it fast

**3.1 — Decide cold starts deliberately.** A cold container costs **7.1 s**.
Pre-launch, Railway scale-to-zero is the cheap choice (see
`COST_AUDIT_2026-08-06.md`). At launch, turn on keep-warm and accept the bill —
no shopper should ever meet a cold Medusa boot.

**3.2 — Enforce an image budget.** The 21 MB regression happened because the
homepage CMS stores whatever URL the admin upload returns. `cloudinaryUrl()`
handles it at render, but consider normalising on upload too so the raw original
is never the stored URL.

**3.3 — Watch the numbers.** `/admin/usage` and the `[usage]` log lines now exist.
Add a periodic check of homepage transfer size so a 20 MB regression is caught by
a number, not by feel.

---

## 6. What to copy from them — and what not to

**Copy:**
- A first paint that depends on nothing (Phase 2.1)
- Prefetched route chunks so in-app navigation is zero-network (2.2 + 2.3)
- Instant local feedback on cart actions; reconcile with the server afterwards
- Cloudinary transforms on every single image, always (0.2)
- Parallel, non-blocking data loading after paint

**Do not copy:**
- **Hardcoding the catalog into the JS bundle.** Fine for 5 products; unworkable
  for 54 across 21 categories, and it kills SEO for product pages.
- **A pure client-side SPA.** You would lose server-rendered product pages, which
  matter for a store that needs Google traffic.
- **A client-only cart.** Yours has real pricing, inventory, regions, promotions
  and Stripe. Those must be server-authoritative — that is correctness, not
  overhead.
- **Their CORS config.** `Access-Control-Allow-Origin: http://localhost:5173` in
  production is a mistake, not a technique.

---

## 7. Expected outcome

| Metric | Today | After Phase 0 | After Phase 1 | After Phase 2 |
|---|---|---|---|---|
| Homepage transfer | 21.1 MB | **~1–2 MB** | ~1–2 MB | ~1–2 MB |
| Load complete | 4.26 s | ~1.5 s | ~1.2 s | **<1 s** |
| `/store/products` | 2.25 s | 2.25 s | **~0.35 s** | ~0.35 s |
| Warm TTFB | 0.85–0.90 s | ~0.85 s | ~0.4 s | **CDN-instant** |
| Cold first hit | 7.1 s | 7.1 s | ~2 s | ~2 s (or eliminated, 3.1) |
| In-app navigation | full round trip | full round trip | faster round trip | **near-zero** |

Phase 0 is free and mostly recovers work you have already done. Phase 1 is a
region setting. Phase 2 is the real engineering, and it is the one that buys the
feeling you described.

---

## 8. Method note

Everything here is reproducible:

```bash
# their stack
curl -sS -D - -o /dev/null https://manvaasam.in/
curl -sS -o /dev/null -w "%{time_starttransfer}\n" https://api.manvaasam.in/api/products

# your DB round-trip cost = the delta between these two
curl -sS -o /dev/null -w "health  %{time_starttransfer}\n" \
  https://mithra-wholefoods-production.up.railway.app/health
curl -sS -o /dev/null -w "regions %{time_starttransfer}\n" \
  -H "x-publishable-api-key: $KEY" \
  https://mithra-wholefoods-production.up.railway.app/store/regions

# the image win
curl -sS -o /dev/null -w "%{size_download}\n" \
  "https://res.cloudinary.com/zwo66f4s/image/upload/f_auto,q_auto,w_800/v1783943941/mithra-wholefoods/<asset>"
```

Browser numbers came from `performance.getEntriesByType('navigation'|'resource')`
on a cold load of each site.
