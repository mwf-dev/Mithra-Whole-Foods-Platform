# Production Roadmap — Analytics, UI, Operations

**Date:** 2026-08-01
**Companion documents:**
[`AUDIT_2026-08-01_FRONTEND_PERF.md`](./AUDIT_2026-08-01_FRONTEND_PERF.md) ·
[`SHIPPING_AUTOMATION_RESEARCH.md`](./SHIPPING_AUTOMATION_RESEARCH.md)
**Status:** analysis and planning only. Nothing implemented.

---

## 1. Analytics — current state

**Instrumentation today is one line:** `<Analytics />` from `@vercel/analytics`
in `apps/web/src/app/layout.tsx:24`. That gives page views and Web Vitals.

**There are zero commerce events.** No `view_item`, `add_to_cart`,
`begin_checkout`, `add_payment_info`, or `purchase`. Consequences:

- Conversion rate is unknowable. You cannot tell whether the perf problems in
  the audit are costing sales, or how much.
- Cart abandonment is invisible — including the specific failure mode where a
  rate-limited backend rejects an add-to-cart and the optimistic UI rolls back
  (`cart-context.tsx:174`). Today that failure is shown to the shopper as a
  toast and then **discarded**. Nobody finds out.
- No attribution. Ad spend cannot be evaluated.
- Search has no telemetry — the in-house engine at
  `apps/backend/src/lib/product-search.ts` has curated synonym groups
  (`SYNONYM_GROUPS`) that are being tuned blind. Zero-result queries are the
  single highest-value dataset this store isn't collecting, and they'd tell you
  what to stock as well as what to alias.

### Recommendation

**Two layers, because they answer different questions:**

**Layer 1 — server-side purchase truth (do first).**
Emit `purchase` from the backend `order-placed` subscriber, not the browser.
It already runs on every order and already has the full order in hand
(`apps/backend/src/subscribers/order-placed.ts`). Server-side events survive ad
blockers, iOS privacy controls and the shopper closing the tab on the
confirmation page — commonly cited as 20–40% of otherwise-lost journey data.
This is a small addition to a file that already exists.

**Layer 2 — client funnel events.**
`view_item` → `add_to_cart` → `begin_checkout` → `add_payment_info`. These need
the browser because they're about intent.

**Tool choice: PostHog.**

| | PostHog | GA4 |
|---|---|---|
| Funnels / session replay | Strong | Weak |
| "Why did checkout fail for this user" | Yes, replay + person view | No |
| Marketing attribution / ad platforms | Weaker | Strong |
| Self-hostable | Yes | No |
| Next.js integration | Well-documented | Via GTM |

The question this project needs answered right now is a **product** question —
*where in the funnel do people drop, and is it latency?* — not a marketing one.
PostHog answers that; GA4 doesn't. Add GA4 later if/when ad spend starts.

**Also instrument, beyond the standard funnel:**
- `search_performed` with `{ query, result_count }` → zero-result report.
- `cart_mutation_failed` with the backend error → catches the rate-limit
  failure mode described in the audit.
- `shipping_option_selected` → tells you whether local delivery or national is
  the real business, which directly informs the shipping phasing.

**Use `after()` from `next/server`** so instrumentation never sits on the
response path. Given that latency is the presenting complaint, analytics must
not become another source of it.

---

## 2. Observability — the actual production gap

Analytics tells you what shoppers did. **Nothing currently tells you when the
site is broken.**

From the audit (§8): six data helpers swallow errors and return `null`/`[]`. A
backend outage or a rate-limit trip renders a **structurally valid, empty
store**. No error boundary fires. No alert. The first report is a customer
email.

Minimum viable production monitoring, in priority order:

1. **Error tracking** (Sentry or equivalent) on both apps. Nothing exists today.
2. **Stop swallowing errors** in `lib/data/*` — at minimum, log before
   returning the empty fallback, so failures are at least *visible*.
3. **Alert on rate-limit 429s** from `/store/*`. Given the ~23 add-to-carts/min
   site-wide ceiling calculated in the audit, this will fire before customers
   complain.
4. **Uptime check** on `GET /health` (already exists per `railway.json`).
5. **Alert on Stripe webhook failures** — currently unverifiable anyway because
   `STRIPE_WEBHOOK_SECRET` is unset (confirmed live at backend boot).

---

## 3. UI — where the work actually is

The visual direction is already decided and reasonable: a Mithra design system
in `tailwind.config.js` (Forest Green primary, warm brown secondary, cream
background, DM Serif Display + Inter). The problem is not the design. **It's
that components bypass it.**

### 3.1 The design system is defined and then ignored

`tailwind.config.js` defines:
```js
primary: { DEFAULT: "#2E7D32", dark: "#1E5B22" }   // Forest Green
background: "#FAF7F1"                              // Cream
```

Actual usage across `src/modules` and `src/app`:

| Hex | Count | Problem |
|---|---|---|
| `#2E5C31` | **44** | A *different* green from `primary` (`#2E7D32`). Not a token. |
| `#F3F7F4` | 15 | Ad-hoc green tint, no token |
| `#52525B`, `#A1A1AA`, `#D4D4D8` | 28 | Zinc greys, unrelated to the `grey` scale in config |
| `#FBF7F0`, `#F7F4EE`, `#F4EFE6` | 5 | Three near-misses of the `cream` token |
| `#244a27`, `#1f291e` | 6 | Hand-rolled hover shades of the wrong green |

**The site is rendering two greens that differ by a shade and two creams that
differ by a hair.** On a page where both appear, it reads as sloppy without
being obviously wrong — which is the hardest kind of visual bug to get a
non-designer to articulate. This is very likely a large part of "the UI needs to
be better."

Additional drift: `font-playfair` is kept as a legacy alias that renders DM
Serif Display, so some components claim one typeface and get another. Two
component systems coexist — `@medusajs/ui` (`Button`, `Heading`, `Text`) next to
hand-rolled Tailwind buttons — with different radii, heights and focus states.

**Highest-leverage UI work, in order:**

1. **Reconcile the palette.** Decide whether the brand green is `#2E7D32` or
   `#2E5C31`, then make it the *only* one. Replace all 44 + 6 hardcoded
   instances with `primary` / `primary-dark`. Same for the three creams → `cream`.
   Mechanical, low risk, and it will visibly tighten every page at once.
2. **Pick one button.** Either `@medusajs/ui` `<Button>` or a house component —
   not both. Currently the PDP add-to-cart is a Medusa `Button`
   (`product-actions/index.tsx:239`) and the card add-to-cart is a raw
   `<button>` (`add-to-cart-button.tsx:107`), with different heights, radii and
   hover treatments, sitting on the same screen.
3. **Feedback on every click.** Sort, filter and paginate currently have no
   pending state at all (audit §6). Perceptually this is indistinguishable from
   "the site is broken." Cheapest large win available.
4. **Retire `font-playfair`.**

### 3.2 What *not* to do

Do not start a visual redesign before the audit's P0 latency work. A redesign on
top of a store where clicks stall will be judged as "still slow, and now it
looks different." Fix response, then appearance.

---

## 4. Consolidated phasing

Ordered by value-per-effort, and sequenced so nothing depends on an unlanded
step. Effort estimates are rough.

### Phase 0 — Switch on what's already built (days, no code)
| # | Item | Why |
|---|---|---|
| 0.1 | Set `SENDGRID_API_KEY` + template ids + `ADMIN_NOTIFICATION_EMAIL` | Order + shipping emails are written and no-op'ing today |
| 0.2 | Set `STRIPE_WEBHOOK_SECRET` | Webhook signatures unverified; confirmed live warning at boot |
| 0.3 | **Rotate every credential ever committed to git** | `get_key.js`, `test-db.js`, `.env.*` remain recoverable from history (removed in `e8251b4`). Removal ≠ rotation. |
| 0.4 | Rename `European Warehouse delivery` fulfillment set | Starter leftover, visible to staff |

### Phase 1 — Latency (1–2 weeks) — *the presenting complaint*
| # | Item | Ref |
|---|---|---|
| **1.0** | **Trace and fix the `/store/products` calculated-price query path** | Audit §9 — measured 4.7–10.9s per call on 2026-08-02, ~20–45× a raw DB round-trip; almost certainly a per-variant N+1. **Do this first** — it dwarfs every other item below combined. |
| 1.1 | Remove unconditional `router.refresh()`; reconcile cart from action return | Audit §1 |
| 1.2 | Add `experimental.staleTimes` | Audit §2 |
| 1.3 | Suspense-split `(main)/layout.tsx`; parallelise `listCartOptions` | Audit §3 |
| 1.4 | Remove PDP mount-time `router.replace` | Audit §4 |
| 1.5 | Pending states on sort/filter/paginate | Audit §6 |

*Target: ~6.5 → ~1 backend request per add-to-cart, and each of those
requests measured in tens of milliseconds instead of seconds.*

**Deployment topology note:** moving the frontend onto the same Railway server
as the backend was considered on 2026-08-02 and rejected — it targets the
Vercel↔Railway hop (tens of ms), not the actual cost (seconds, in 1.0 above).
See Audit §9b for the measurement.

### Phase 2 — Correctness & visibility (1–2 weeks)
| # | Item | Ref |
|---|---|---|
| 2.1 | Fix pagination past 100 products | Audit §5 — real bug |
| 2.2 | Stop swallowing errors in `lib/data/*` | Audit §8 |
| 2.3 | Sentry on both apps | §2 |
| 2.4 | PostHog + server-side `purchase` + funnel events | §1 |
| 2.5 | Fix cache tag keying for products/categories/regions | Audit §7 |

### Phase 3 — Shipping (2–4 weeks)
Per [`SHIPPING_AUTOMATION_RESEARCH.md`](./SHIPPING_AUTOMATION_RESEARCH.md):
pickup set → Exton postal-code geo zone → product weights backfill → EasyPost
provider module → tracking webhooks.

### Phase 4 — UI system (1–2 weeks, parallel-safe with Phase 3)
Palette reconciliation → single button system → typography cleanup.

### Phase 5 — Structural
| # | Item |
|---|---|
| 5.1 | Replace IP-keyed `/store/*` rate limit with something session-aware (**do not just raise the number**) |
| 5.2 | Move the in-memory search index out of process, or accept per-instance divergence explicitly |
| 5.3 | Static shell / PPR for catalog routes (needs 1.3 first) |
| 5.4 | First tests for `apps/web` — there are none |

---

## 5. Open decisions needed from the business

1. Exton local delivery radius — which ZIP codes? (blocks Phase 3)
2. Free-shipping threshold? (`FreeShippingPriceNudge` is wired, rule undefined)
3. Expected parcel volume in 12 months? (decides EasyPost vs ShipEngine)
4. Is anyone shipping orders daily today, and in what tool? (decides whether a
   warehouse UI is worth paying for)
5. Brand green: `#2E7D32` or `#2E5C31`?

---

## 6. Sources

- [Next.js 15 — caching and Client Router Cache changes](https://nextjs.org/blog/next-15)
- [PostHog — Next.js integration](https://posthog.com/docs/libraries/next-js)
- [PostHog — sending events server-side](https://posthog.com/docs/getting-started/send-events)
- [Next.js `after()` for post-response work](https://arrangeactassert.com/posts/nextjs-after/)
- [Server-side tracking for ecommerce — Cometly](https://www.cometly.com/post/server-side-tracking-solutions-for-ecommerce)
- [Best analytics tools for Next.js 2026 — Amplitude](https://amplitude.com/compare/best-analytics-tools-nextjs)
