# Browser QA + Performance + UI Audit — 2026-08-02

> **CORRECTION (same day, after re-testing against production).**
> §3 P0-1, P0-2 and P0-6 below are **wrong as written**. They are not code
> defects — they are symptoms of one thing: the local backend is slow enough
> that writes exceed the 10 s abort in `resilient-fetch.ts:45`, which is not
> retried for writes. The error surfaced is
> `"Error setting up the request: This operation was aborted"`.
>
> Measured, same Neon DB, same publishable key:
>
> | Write | Local | Railway (prod) |
> |---|---|---|
> | `POST /store/carts` | 8.92 s | 2.93 s |
> | `POST /store/carts/:id` (address) | 7.82 s | 2.43 s |
>
> Production stays under the 10 s cliff, so checkout completes there — as the
> repo owner reported. **Checkout is not broken.** What *is* real is that prod
> has only ~4 s of headroom on a write that is deliberately never retried.
>
> Everything else in this report was re-verified directly against production and
> **still stands** — see §8.

Real-browser end-to-end test of the Mithra Whole Foods storefront, driven with
[`vercel-labs/agent-browser`](https://skills.sh/vercel-labs/agent-browser/agent-browser)
(Chrome 151 via CDP). UI recommendations are checked against the
`vercel-labs/web-design-guidelines` (Web Interface Guidelines) and
`medusajs/storefront-best-practices` skills, both installed into `.agents/skills/`.

Screenshots: `dogfood-output/screenshots/`.

---

## 0. How this was tested (and what that means for the numbers)

| | |
|---|---|
| Storefront | **Production build** (`next build` + `next start`) on `:8000` — not dev mode |
| Backend | `medusa develop` on `:9000`, connected to the live Neon DB |
| Browser | Real Chrome 151, headless, desktop 1440×1000 and iPhone 16 Pro (402×874) |
| Region | USA / `usd` (the only region that exists) |
| Catalogue | 57 products, 17 categories |

**Caveat on absolute latency.** The backend ran on a laptop talking to Neon over
the public internet, so every backend number below is inflated relative to
Railway↔Neon in production. What does *not* change with hosting is the **shape**:
the fixed per-request floor, the number of requests per page, and the payload
sizes. Those are the findings I'd act on. This is the same conclusion
`docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §9b reached — don't try to fix this by
moving boxes around.

**Two things I did not do.** I created one throwaway account
(`qa-tester+1785647795@example.com`, recorded in `dogfood-output/test-account.txt`)
because checkout has no guest flow — you'll want to delete that row. And I did
not enter card details, so no order was placed. That turned out to be moot:
**checkout is blocked before payment anyway** (P0-1).

---

## 1. Verdict

The commerce engine is real and mostly works — catalogue, search, cart, account,
address capture and the review module are all genuinely functional and in places
better than I expected (the optimistic cart is good). But **a shopper cannot
currently complete a purchase**, and the homepage ships **21 MB**.

| Area | State |
|---|---|
| Catalogue / browse / search | Good |
| Cart (page) | Good |
| Cart (header dropdown) | **Broken** |
| Checkout | **Blocked — cannot reach payment** |
| Shipping config | **Contradicts what the site promises** |
| Legal / info pages | **All 10 are 404** |
| Performance | **Poor** — 21 MB homepage, 3–7 s FCP |
| Mobile | **Search is unreachable** |
| Accessibility | Poor — no form field is labelled |

---

## 2. What works well

Worth saying plainly, because a lot of this is solid:

- **Search is genuinely good.** In-house engine, `/store/search` returns in
  **~450 ms** — the fastest endpoint in the app. "rice" → 23 relevant results,
  correctly priced. No external service, no Meilisearch, no cost.
- **Optimistic cart.** Adding from a listing card flips the button to a
  `− 1 in cart +` stepper immediately. Cart badge updates instantly. This is the
  one place in the app with real interaction feedback and it feels right.
- **Cart page is correct and well-designed.** Right product title, right price,
  in-stock badge, free-shipping progress bar (`Add $45.01 more for free
  delivery`), promo-code entry, quantity stepper. Clean.
- **Checkout structure is the right shape.** Four-step accordion (Address →
  Delivery → Payment → Review), address autocomplete, "Use my current location",
  fields pre-filled from the account, live order summary. Address data round-trips
  correctly — I verified `province: "PA"` persisted to the cart via the API.
- **Reviews module is wired end-to-end** and renders on the PDP with a proper
  empty state ("No reviews yet — be the first…") and a sign-in prompt.
- **Category taxonomy is real** — 17 categories with correct counts, and a handle
  containing a slash (`lentils-/-dals`) still routes correctly.
- **Zero uncaught console errors** across the whole browse flow.
- **Product data is in better shape than the seed suggests** — 55/57 have USD
  prices and thumbnails.

---

## 3. P0 — launch blockers

### P0-1. Checkout is hard-blocked at Delivery → Payment

**The single most important finding.** Select a shipping method and
"Continue to payment" stays permanently disabled. Reproduced across a soft
navigation, a full reload, and a navigate-away-and-return.

The shipping method *is* applied. Verified directly against the API:

```
GET /store/carts/cart_01KZ0E6WTYNFAF89G4MKD6RXDQ
  shipping_methods: [{ id: "casm_01KZ0ENKBBFTB703X88WSHMPER",
                       name: "Standard Shipping", amount: 10 }]
  shipping_total: 10   item_total: 3.99   total: 13.99
```

The gate is `apps/web/src/modules/checkout/components/shipping/index.tsx:408`:

```tsx
disabled={!cart.shipping_methods?.[0]}
```

The `cart` prop feeding this button does not reflect the mutation, while the
order-summary panel on the same screen *does* (it shows `Shipping $10.00`). Two
different cart objects on one page, one of them stale. Given
[CLAUDE.md](../CLAUDE.md) invariant 6 (cache tags keyed by a per-browser
`_medusa_cache_id`), stale `retrieveCart` caching is the likely mechanism —
worth confirming before fixing, but the user-visible fact is verified and
absolute: **no one can buy anything.**

Evidence: `dogfood-output/screenshots/13-blocked-delivery.png`

### P0-2. Order total excludes shipping

Same screen: `Shipping $10.00` and `Total $3.99`. The API says `total: 13.99`.
The customer-facing total is arithmetically wrong on both the cart page and the
checkout summary. Cart also shows `Shipping $0.00 / Taxes $0.00` before an
address exists — that should read "Calculated at checkout", not a number.

### P0-3. Every legal and information page is a 404

All ten footer links are dead:

```
404  /us/terms-conditions      404  /us/contact
404  /us/delivery-information  404  /us/returns
404  /us/about-us              404  /us/site-map
404  /us/privacy-policy        404  /us/brands
404  /us/special-offers        404  /us/specials
```

The signup form also links to "Privacy Policy" and "Terms of Use" — both dead —
directly above a button that says the shopper agrees to them. Stripe's terms
generally require a reachable refund/returns policy, and a food business with no
Contact page is a trust problem regardless of the legal angle. These are the
cheapest P0 to fix: ten static MDX/TSX pages.

### P0-4. The free-delivery promise cannot be fulfilled

The site says "Free delivery on orders above $49" in the top bar on every page.
The cart says "Eligible for FREE shipping" and "Add $45.01 more for free
delivery". But the only shipping options that exist are:

```
Standard Shipping  $10.00
Express Shipping   $10.00
```

There is **no free-shipping option configured at all**, at any cart value, and
**no local-pickup option** despite Exton being a local-delivery business
(matches `docs/SHIPPING_AUTOMATION_RESEARCH.md`). A shopper who adds $49 of
groceries to earn free delivery will be charged $10 at checkout.

### P0-5. Express and Standard cost the same

Both $10.00. Either price Express higher, or remove it.

### P0-6. Cart dropdown shows wrong data

Add an item, open the header cart:

- Product name renders as **"Default"** (the variant title, not the product title)
- **"Variant: Default"** exposed to shoppers
- Price renders as `3.99` — **no currency symbol**
- **`Subtotal (excl. taxes)  0`** — zero, while the line item is 3.99

The cart *page* gets all of this right, so the bug is isolated to
`modules/layout/components/cart-dropdown/index.tsx`. This is the highest-intent
UI in the store and it currently looks broken.

Evidence: `dogfood-output/screenshots/04-after-add.png`

### P0-7. The first two "Best Sellers" cannot be bought

`Wood Pressed Groundnut Oil` and `Organic Turmeric Powder` render as
**"Price unavailable" / "Currently unavailable"**. They are the only 2 of 57
products with no USD price (they're the original INR seed products), they also
have no thumbnail, and they are pinned first in "Today's Best Sellers" on the
homepage *and* first in every "related products" block on every PDP.

Every visitor's first impression is two dead products. Either price them in USD
or unpublish them — a five-minute admin fix with outsized impact.

---

## 4. P1 — performance

### P1-1. The homepage is 21 MB

Measured from Resource Timing on a production build:

```
total page weight   21.11 MB
requests            90
TTFB                1,504 ms
First Contentful Paint 3,100 ms
load                5,886 ms
```

**Ten Cloudinary PNGs at 2.1–2.3 MB each** account for ~20 MB of that. They are
loaded as CSS `background-image`, which bypasses `next/image` entirely — no
AVIF/WebP, no responsive `srcset`, no lazy loading, no dimensions:

- `apps/web/src/modules/home/components/offer-cards.tsx:33`
- `apps/web/src/modules/home/components/promo-cards.tsx:48`
- `apps/web/src/modules/home/components/category-tiles.tsx:57`

The URLs carry **no Cloudinary transformation parameters** — they're raw
originals (note the `.png.png` double extension from the upload path). On a 4G
phone this homepage is roughly a 40-second load.

This is the highest value-per-hour fix in the whole audit. Two options:

1. Append `f_auto,q_auto,w_800,dpr_auto` to the Cloudinary URLs — a one-line
   helper, keeps the CSS-background layout, ~95% size reduction immediately.
2. Better: convert the three components to `next/image` with `fill` +
   `sizes` and drop the background-image approach.

`next.config.js` already declares `formats: ["image/avif","image/webp"]` and a
24 h `minimumCacheTTL` — that config is doing nothing for these images.

### P1-2. Product-detail prefetch fires an N+1 storm

Loading the store listing triggers **eight separate** backend calls, one per
product card, each fetching a single product by handle, each taking ~6 seconds:

```
GET /store/products?...&handle=red-rice-sivapu-arisi-10-lbs   6,255 ms
GET /store/products?...&handle=kullakar-rice-2lbs             6,192 ms
GET /store/products?...&handle=karuppu-kavuni-rice-2-lbs      6,274 ms
GET /store/products?...&handle=bridegroom-samba-rice-...      6,144 ms
GET /store/products?...&handle=bamboo-rice-moongil-arisi-1lb  6,427 ms
GET /store/products?...&handle=tirunelveli-ghee-halwa-250g    5,657 ms
GET /store/products?...&handle=karupatti-...-mysore-pak-250g  5,866 ms
GET /store/products?...&handle=red-rice-sivapu-arisi-2-lbs    6,291 ms
```

That's ~48 seconds of backend work from *one* listing page view, and it lands
squarely on the site-wide 150 req/min `/store/*` budget (CLAUDE.md invariant 2).
This is Next's link prefetch rendering each PDP server-side. Given invariant 3
(every route is dynamic, so `staleTimes.dynamic: 0` discards the payloads
anyway), this work is **bought and then thrown away**.

Fix direction: set `experimental.staleTimes` so prefetches are actually reused,
and/or `prefetch={false}` on product-card links until then.

### P1-3. `/store/products` has a ~1.2 s fixed floor — it is not just pricing

This **corrects the working hypothesis in CLAUDE.md**, which attributes the cost
to an N+1 in `calculated_price`. Measured, 3 runs each:

| Request | Time |
|---|---|
| `?limit=1&fields=id` | 1.12 – 2.04 s |
| `?limit=1&fields=id,title` | 1.12 – 1.26 s |
| `?limit=1&fields=*variants` | 3.08 – 3.20 s |
| `?limit=1` (default fields) | 3.08 – 3.57 s |
| `?limit=12` | 3.62 – 3.80 s |
| `?limit=12` + `calculated_price` | 4.90 – 5.55 s |
| `?limit=100` + `calculated_price` | 4.73 – 7.00 s |

Fetching **one product, id only** costs 1.2 s. Pricing adds ~1.5 s; variants add
~2 s; going from 1 to 100 products adds only ~1.5 s. So the cost decomposes as
roughly **1.2 s fixed + ~2 s variants + ~1.5 s pricing + ~15 ms/product**.

The dominant term is a **fixed per-request cost**, not a per-product one. That
points at publishable-key → sales-channel resolution or the base product query,
not at price N+1. For contrast, on the same connection: `/homepage` = **225 ms**,
`/store/search` = **450 ms**, `/store/collections` = **740 ms**,
`/store/product-categories` = **930 ms**. Only `/store/products` is pathological.

Worth tracing before optimising — but trace the *fixed* cost, not the loop.

### P1-4. Two wasted backend calls on every single page render

```
GET /store/locales           → 404   (~450–1,300 ms)
GET /store/customers/me      → 401   (~450–2,600 ms)
```

`/store/locales` is a Medusa-Cloud-only endpoint; this backend has no such route.
`apps/web/src/lib/data/locales.ts` handles the 404 gracefully but still pays for
the round trip on **every page**. The store has exactly one region and one
locale — the language selector has nothing to select. Removing it, or caching
the negative result, removes a guaranteed 404 per page view from a shared
150 req/min budget.

The guest `401` is expected (CLAUDE.md invariant 8 says don't report it) but it
is still a full round trip per render.

### P1-5. Other measured latency

```
Store listing   TTFB 1,940 ms   FCP 2,324 ms
PDP             TTFB 2,137 ms   FCP 3,212 ms   load 7,317 ms
POST /store/carts                8,739 ms
```

Cart creation at 8.7 s is the slowest single call in the app. It happens on the
first add-to-cart, so it's the first thing a new shopper experiences.

Also confirmed still live: the store listing fetches `limit=100` to render 12
(CLAUDE.md invariant 5).

---

## 5. P2 — conversion and UX

### P2-1. No guest checkout

`/us/checkout` redirects to `/us/account?redirect=...`. A shopper with a full
cart lands on a page headed **"WELCOME BACK"** with no explanation, no
reassurance the cart is kept, no progress indicator, and **no "Forgot password"
link** — so a returning customer who forgot their password is simply stuck.

For grocery, guest checkout is close to table stakes. This is likely the single
largest conversion lever in this list after the P0 fixes.

### P2-2. Search is unreachable on mobile

Verified on iPhone 16 Pro: the search `<input>` exists in the DOM but is
`display: none`, and the mobile header contains **no search icon or trigger**
— just hamburger, logo, account, wishlist, cart. The hamburger drawer is a
category list; no search there either.

For a 57-SKU store with names like "Karuppu Kavuni Rice" and "Maapillai Samba
Arisi", search is the primary discovery path. Mobile is typically 60%+ of
grocery traffic.

### P2-3. Placeholder content is live on the homepage

- **"Deals under ₹99"** — Indian rupee symbol on a USD-only store, in the
  Special Offers strip.
- **"test 1"** and **"test 2"** — the two "Exclusive Promos" tiles, with white
  text sitting unreadably on a light-background photo, overlapping the
  "Shop Now" button.
- All four "Special Offers" tiles and both "Exclusive Promos" tiles use the
  **same photograph** (and 10 distinct URLs for what is visually 2 images —
  which is also why P1-1 is 21 MB rather than 4 MB).
- **"Shop by Category" shows 3 categories** (Cold Pressed Oils, Spices, Ghee)
  while the nav lists 17. Makes the catalogue look 6× smaller than it is.

All of this is in the homepage CMS at `/app` — content edits, not code.

### P2-4. A modal blocks the hero on first visit

The "Welcome to Mithra Whole Foods" sign-in interstitial covers the headline
before the visitor has done anything. Interstitials on first paint are a
well-known bounce driver, and this one fires before the shopper knows what the
site sells. Move it to cart or second-visit, or drop it.

### P2-5. Checkout is visually a different website

Plain white, no brand green, no logo image (just the words "MITHRA WHOLE
FOODS"), different type scale, no trust signals — no payment logos, no security
badge, no returns note, no support contact. Brand consistency drops off exactly
where purchase anxiety peaks.

### P2-6. Address form issues

- **State/Province is free text**, not a US state dropdown. I typed "PA"; the
  address summary then rendered `19341, Exton / US` — **the state is dropped from
  the display** (it *is* stored correctly; it's a display bug).
- Field order is `Address → Company → Postal code → City → Country → State`.
  US convention is Address → City → State → ZIP.
- No Address Line 2 / apartment / suite field — only "Company".

### P2-7. No filters anywhere

Neither the store listing nor search results offer price, category, dietary or
availability filters — only a "Sort by" dropdown. The category sidebar is a
fixed-height scroll box that clips mid-item at 10 of 17 categories with no
scroll affordance.

### P2-8. No pending state on any navigation

Per CLAUDE.md invariant 7, only the cart has optimistic UI. Confirmed: "Go to
checkout", "Continue to delivery", "Join", sort, filter and paginate all fire
multi-second server round trips with **zero** feedback. During signup the page
sat still for ~6 s with no spinner. Users will double-click these.

### P2-9. Non-existent products return HTTP 200

`/us/products/nope` renders the 404 page **with a 200 status**. Search engines
will index it as a real page. Use `notFound()` so the status matches the content.
(`/us/does-not-exist` correctly returns 404.)

### P2-10. Chat widget overlaps content on every page

The floating support bubble sits on top of product cards, the PDP "Add to cart"
area, and the checkout summary at every breakpoint tested.

---

## 6. P3 — accessibility, content quality, polish

### P3-1. No form field in the storefront is programmatically labelled

`apps/web/src/modules/common/components/input/index.tsx:50` renders:

```tsx
<input type={inputType} name={name} ... />     {/* no id */}
<label htmlFor={name}>{label}</label>          {/* htmlFor matches id, not name */}
```

`htmlFor` resolves against `id`, and the input has none. Every field in login,
registration, address and checkout reports an accessible name of `"  "`. Screen
readers announce "edit, blank"; password managers and browser autofill lose
their strongest signal.

**One-line fix:** add `id={name}` to the `<input>`. This is the highest
value-to-effort item in the report.

### P3-2. 56 tap targets below the 44 px minimum on mobile

Including 8×8 px hero carousel dots and 32×32 px wishlist buttons. WCAG 2.5.5
and the Web Interface Guidelines both call for ≥44 px.

### P3-3. Product copy quality

- **33 of 57 descriptions contain raw HTML entities** (`&nbsp;`, tags). They're
  rendered with `{product.description}` in JSX, so React escapes them and
  shoppers literally see `&nbsp;` in the text.
- **6 of 57 descriptions are scraped junk** — the literal string
  `"Tags:\n  Red Rice,  Sivapu Arisi"` where the product copy should be. Affected
  PDPs show a title, a price, and nothing else. `Red Rice (Sivapu Arisi) - 2 lbs`
  is one of them.
- **52 of 57 products have ≤1 image**, so the PDP gallery is single-image
  everywhere and the one image is letterboxed with large white bars.
- No ingredients, origin, weight, nutrition or usage info on any PDP — for
  traditional foods, that copy *is* the sell.

### P3-4. `"Variant: Default"` is shown to shoppers

On the cart page, cart dropdown and checkout summary. Hide the variant line when
a product has a single unnamed variant.

### P3-5. Design-system drift, confirmed visually

CLAUDE.md flags this and the browser confirms it: listing cards use a green
`Add To Cart` button, the PDP and checkout use a **black** one, at different
heights and radii — two button systems (`@medusajs/ui` `<Button>` and raw
Tailwind) side by side. Tokens exist in `tailwind.config.js` and are bypassed.

### P3-6. Console noise

`[Vercel Web Analytics] Failed to load script from /_vercel/insights/script.js`
on every page (expected outside Vercel, but it's the only console output, so it
masks real signal). One `[cart.add]` Server Component error was captured during
testing with the message suppressed by the production build — worth checking
Sentry once `SENTRY_DSN` is set.

### P3-7. Footer has no business information

No address, phone, hours or payment-method icons — for a local Exton PA food
business those are primary trust signals, and the Contact page is a 404 (P0-3).

---

## 7. Recommended order of work

**Ship-blocking, do first (~1–2 days)**

1. Fix the delivery→payment gate (P0-1) — nothing else matters until this works.
2. Fix the cart total to include shipping (P0-2).
3. Configure shipping: a free option above $49, differentiated Express pricing,
   and a local-pickup option (P0-4, P0-5).
4. Fix the cart dropdown: title, currency, subtotal (P0-6).
5. Price or unpublish the two unbuyable products (P0-7).
6. Create the ten legal/info pages (P0-3).

**Highest value-per-hour, do next (~1 day)**

7. Cloudinary transformation params on the three background-image components —
   21 MB → ~1 MB (P1-1).
8. `id={name}` in the shared `Input` component — fixes accessibility across every
   form in the app (P3-1).
9. Remove or negatively-cache the `/store/locales` call (P1-4).
10. Clean the homepage CMS: ₹99, "test 1"/"test 2", distinct offer images, all 17
    categories (P2-3).

**Conversion (~2–3 days)**

11. Guest checkout, plus a "Forgot password" link (P2-1).
12. Mobile search entry point (P2-2).
13. Pending states on every navigation and form submit (P2-8).
14. Brand the checkout and add trust signals (P2-5).
15. Drop or defer the first-visit modal (P2-4).

**Performance investigation (timeboxed)**

16. Kill the prefetch storm — `experimental.staleTimes`, or `prefetch={false}`
    on product cards (P1-2).
17. Trace the ~1.2 s *fixed* cost of `/store/products` — sales-channel resolution
    is the first place I'd look, not price N+1 (P1-3).

**Content (ongoing)**

18. Rewrite the 6 junk descriptions, strip `&nbsp;` from the other 33, add
    ingredients/origin/weight, add second and third product images (P3-3).

---

## Appendix — endpoint latency reference

Local backend → Neon, 3 runs each, median.

| Endpoint | Median |
|---|---|
| `GET /homepage` | **225 ms** |
| `GET /store/search?q=rice` | **450 ms** |
| `GET /store/collections` | 740 ms |
| `GET /store/product-categories?limit=100` | 930 ms |
| `GET /store/regions` | 1,120 ms |
| `GET /store/products?limit=1&fields=id` | 1,240 ms |
| `GET /store/products?limit=1` | 3,400 ms |
| `GET /store/products?limit=12` | 3,730 ms |
| `GET /store/products?limit=12` + price | 5,290 ms |
| `GET /store/products?limit=100` + price | 6,660 ms |
| `POST /store/carts` | **8,739 ms** |

Rate limiting behaved exactly as documented: `RateLimit-Policy: 150;w=60`,
shared across all shoppers because the storefront is server-rendered.

---

## 8. Production re-verification (2026-08-02, later)

Re-tested every finding directly against `mithra-whole-foods.vercel.app` and the
Railway backend, because the repo owner correctly pointed out that orders *do*
complete in production.

### Retracted — local-latency artifacts, not defects

| Was | Actually |
|---|---|
| P0-1 checkout blocked at Delivery→Payment | The address/shipping write exceeded the 10 s abort in `resilient-fetch.ts:45`. `setShippingMethod` **does** call `revalidateCart` correctly. Works in prod. |
| P0-2 total excludes shipping | Same cause — the summary was rendering a cart whose update had been aborted. |
| P0-6 cart dropdown shows "Default" / subtotal 0 | That was the **optimistic placeholder** from `cart-context.tsx:207`, left on screen because the server confirmation never landed. `item.title` from the API is the correct product title. |

Local git diff was also checked: the uncommitted changes to
`shipping/index.tsx` and `cart.ts` are **analytics and error-reporting only** —
no behaviour change versus what is deployed.

### Confirmed real in production

| Finding | Production evidence |
|---|---|
| **20 MB of raw homepage images** | 9 Cloudinary URLs, 2,148–2,314 KB each, measured by `Content-Length` on the live assets. Same URL with `f_auto,q_auto,w_800` → **61 KB** (webp). |
| **All 10 footer pages 404** | Verified on the live domain — terms, privacy, contact, returns, about, delivery, sitemap, brands, specials, special-offers. |
| **Soft 404** | `GET /us/products/nope` → **HTTP 200** on production. |
| **Standard = Express = $10** | `GET /store/shipping-options` on the Railway backend returns exactly 2 flat options, both `amount: 10`. |
| **No free-shipping or pickup option** | Same call — nothing else is configured, at any cart value. |
| **2 products with no USD price** | Shared Neon DB; unchanged. |
| **`/store/locales` 404 per render** | Code-level, identical in both environments. |
| **No form field labelled** | Code-level, identical in both environments. |
| **No mobile search entry point** | Code-level, identical in both environments. |
| **₹99 / "test 1" / "test 2"** | Live on the production homepage. |

### The real latency finding

Production `/store/products?limit=12` is **1.51 s** versus **3.73 s** locally.
Faster, but still 1.5 s for twelve products — and the per-*request* floor
identified in §4 P1-3 is what dominates it, not row count.

The 10 s write abort is the thing to watch: it is not a hypothetical. It fires
reliably on a laptop today, and production sits roughly 4 s away from it on a
call that, by design, is never retried.

## 9. Fixes applied (2026-08-02)

| Fix | File | Verified |
|---|---|---|
| Cloudinary `f_auto,q_auto,dpr_auto,w_*,c_limit` on the 9 CSS-background tiles | new `lib/util/cloudinary.ts`; `offer-cards.tsx`, `promo-cards.tsx`, `category-tiles.tsx` | Homepage **21.11 MB → 1.42 MB**, FCP **3,100 → 1,996 ms**, load **5,886 → 2,593 ms**, no visual change |
| `id={name}` so `<label htmlFor>` resolves | `modules/common/components/input/index.tsx` | `email`/`password` now report real accessible names |
| Memoize the `/store/locales` 404 for 1 h (Next does not cache failed responses) | `lib/data/locales.ts` | Removes one guaranteed failed round trip per render |
| Cart dropdown uses `product_title`, and the cart read requests `+subtotal`, `+currency_code`, `+items.product_title` | `cart-dropdown/index.tsx`, `lib/data/cart.ts` | Fields confirmed present on the prod backend response |
| 7 unit tests for the Cloudinary helper | `lib/util/cloudinary.test.ts` | `51/51` passing |
