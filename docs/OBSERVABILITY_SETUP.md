# Analytics & Resilience — Setup Guide

**Implemented:** 2026-08-01. All code is in place and verified running.
**What's left for you:** add the keys below. Nothing else.

Every variable here is optional. With none of them set the pipeline is fully
wired but **inert** — no events sent, no errors reported, and the app behaves
exactly as it did before. Add a key to switch that sink on. This is deliberate:
a missing key must never be able to break the shop.

---

## 1. What you need to add

### PostHog (product analytics + session replay)

1. Create a free project at [posthog.com](https://posthog.com).
2. Copy **Project API key** from Settings → Project.

**`apps/web/.env.local`** (and Vercel env vars):
```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
POSTHOG_KEY=phc_xxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

**`apps/backend/.env`** (and Railway env vars):
```
POSTHOG_KEY=phc_xxxxxxxxxxxx
POSTHOG_HOST=https://us.i.posthog.com
```

The backend key is what makes revenue reporting trustworthy — see §3.

### Sentry (error tracking)

1. Create a project at [sentry.io](https://sentry.io) → platform **Next.js**.
2. Copy the **DSN**.

**`apps/web/.env.local`** + Vercel:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@oyyyy.ingest.sentry.io/zzzz
```

**`apps/backend/.env`** + Railway:
```
SENTRY_DSN=https://xxxx@oyyyy.ingest.sentry.io/zzzz
```

Optional — readable stack traces instead of minified ones. Builds succeed
without these:
```
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=sntrys_xxxx
```

### Per-shopper rate limiting (no vendor, no cost — do this one)

Generate one random value and set it **identically** on both sides:

```bash
openssl rand -hex 32
```

`apps/web/.env.local` + Vercel, **and** `apps/backend/.env` + Railway:
```
STOREFRONT_PROXY_SECRET=<the value you just generated>
```

Why this matters is in §4. It is the single highest-impact variable here, and
it costs nothing.

---

## 2. What now gets tracked

Full typed catalogue: `apps/web/src/lib/analytics/events.ts`.

| Stage | Events |
|---|---|
| Browse | `product_viewed`, `product_list_viewed` |
| Search | `search_performed`, **`search_no_results`** |
| Cart | `cart_item_added` (with `source`: pdp / product_card / buy_again), `cart_quantity_changed`, `cart_item_removed`, **`cart_mutation_failed`** |
| Checkout | `checkout_started`, `checkout_step_completed`, `shipping_option_selected`, `payment_method_selected` |
| Revenue | `order_completed` (client **and** server — see §3) |

Three of these answer questions you currently cannot answer at all:

- **`search_no_results`** — every query that found nothing. This tells you what
  to stock, and what to add to `SYNONYM_GROUPS` in
  `apps/backend/src/lib/product-search.ts`. You are tuning that list blind today.
- **`cart_mutation_failed`** — an add-to-cart the backend rejected. Previously
  shown as a toast and then discarded, so nobody ever found out. Usually caused
  by the rate limit in §4.
- **`shipping_option_selected`** — whether local delivery or national parcel is
  the real business. This directly decides the phasing in
  [`SHIPPING_AUTOMATION_RESEARCH.md`](./SHIPPING_AUTOMATION_RESEARCH.md).

**Privacy:** only the customer **id** is ever sent to PostHog — never name,
email or address. Session replay masks all text and inputs. Sentry has
`sendDefaultPii: false` and strips `authorization`/`cookie` headers.

---

## 3. Why `order_completed` fires twice

It's emitted from two places on purpose:

| Source | Where | Survives ad blockers? |
|---|---|---|
| Client | order confirmation page | No |
| **Server** | `apps/backend/src/subscribers/order-placed.ts` | **Yes** |

The client event measures *funnel completion*. The server event is
*authoritative revenue* — it fires from the `order.placed` handler where the
order is already committed, so a closed tab or a blocked script cannot lose it.
Industry estimates put browser-side loss at 20–40% of journeys.

> **When building revenue reports, deduplicate on `order_id`.** The server event
> carries `source: "server"`; filter on that for revenue and use the client one
> only for funnel conversion rates.

Note the subscriber was restructured so analytics fires **before** the SendGrid
module is resolved. That module is absent while `SENDGRID_API_KEY` is unset —
the current state — and it returns early, which would otherwise have taken
revenue reporting down along with the emails.

---

## 4. The rate-limit fix (read this one)

`/store/*` is limited to 150 req/min **keyed by client IP**. Because the
storefront is server-rendered, every shopper's request reaches Medusa from a
single IP — the Next server's. So that limit was never a per-abuser control; it
was a **site-wide ceiling shared by everyone at once**, and normal browsing
could exhaust it. See [`AUDIT_2026-08-01_FRONTEND_PERF.md`](./AUDIT_2026-08-01_FRONTEND_PERF.md) §1.

The storefront now forwards the real shopper IP, authenticated with
`STOREFRONT_PROXY_SECRET`. The backend honours that header **only** when the
secret matches — trusting an unauthenticated `x-forwarded-for` would be a
trivial bypass of the limiter, which is worse than the original bug.

**With the secret unset on either side, behaviour is exactly as before**, so it
is safe to deploy the two sides in any order.

---

## 5. Resilience layer

`apps/web/src/lib/util/resilient-fetch.ts` now wraps **every** Medusa call
(hooked in at `apps/web/src/lib/config.ts`, the single point all traffic flows
through).

Retry policy — the asymmetry is deliberate:

| Failure | GET / HEAD | POST / PUT / DELETE |
|---|---|---|
| 429 rate limited | retry | **retry** — rejected before the handler runs, so the write definitively did not happen |
| 502 / 503 / 504 | retry | **no** — the write may have landed; retrying risks a duplicate order or a double charge |
| 500 | no | no — a deterministic bug won't fix itself in 200 ms |
| Network / timeout | retry | **no** — indistinguishable from "it succeeded and the response was lost" |

Backoff uses **full jitter**, because all shoppers share one server IP and trip
the limit simultaneously; un-jittered backoff would march them into the next
window in lockstep and trip it again. `Retry-After` is honoured when present.
Each attempt times out after 10s.

This decision table is verified by 20 assertions covering every status/method
combination — including that a `503` on a `POST` is never replayed.

**Reporting is filtered to real incidents only.** Expected 4xx outcomes
(`401` from `customers/me` for every signed-out shopper, `404` from a stale
cart cookie) are *not* reported — otherwise the error tracker fills with noise
and stops being read. Only 5xx, 429 and network failures are reported.

---

## 6. Health check

`GET /health` on the storefront (`apps/web/src/app/health/route.ts`).

Deliberately **deep**: it verifies the storefront can reach Medusa and get a
usable region back. A shallow "is Next alive" check would keep returning 200
during the exact failure this app is prone to — Next happily serving an empty
shop while the backend is unreachable.

```
200 → {"status":"healthy","backend":{"reachable":true,"regionCount":1,...}}
503 → {"status":"unhealthy","reason":"backend unreachable",...}
503 → {"status":"unhealthy","reason":"backend returned 429","rate_limited":true,...}
```

**Point your uptime monitor at `/health`, not at `/`.** The backend keeps its
own `GET /health` (Railway probe), which is now exempted from rate limiting so a
429 can never page you about a healthy service.

---

## 7. No more silent empty stores

Previously, six `lib/data/*` helpers caught backend failures and returned
`null`/`[]`, so an outage rendered a structurally valid, **completely empty
store** — no error boundary, no log, no alert. The first sign of trouble was a
customer email.

The fallbacks are still there (an empty grid beats a 500 for the shopper), but
they are no longer silent. Every one now reports first, via
`swallow(fallback, scope)` or an explicit `reportError` — see
`apps/web/src/lib/observability/report.ts`.

All error boundaries (`global-error`, main, checkout) now report to Sentry with
the `digest`, which is the only handle that links a client boundary to its
server-side cause.

---

## 8. Recommended alerts

Once the DSN is in, create these in Sentry:

1. **`rate_limited:true` tag appears** → the shared budget is exhausted. Most
   likely production failure; fires before customers complain.
2. **`scope:boundary.checkout`** → highest severity in the app. Whatever landed
   there cost a sale.
3. **`scope:checkout.initiatePaymentSession`** → payment setup failing, with
   the shopper already committed.
4. **`/health` returns 503 twice in a row** (uptime monitor, not Sentry).

In PostHog, build one funnel: `product_viewed → cart_item_added →
checkout_started → order_completed`. That single chart tells you whether the
latency work in the roadmap is worth doing, and how much it's worth.

---

## 9. Verified on 2026-08-01

- ✅ Storefront and backend typecheck clean (one pre-existing `import.meta`
  error in `src/admin/routes/homepage/page.tsx`, unrelated — confirmed present
  before these changes).
- ✅ **`next build` succeeds, exit 0, no warnings.** (The first build surfaced
  two Sentry deprecations — `disableLogger` and `automaticVercelMonitors` — both
  moved to the current `webpack.*` API and re-verified.)
- ✅ Both dev servers boot; `/us` and `/us/store` return 200; no console errors.
- ✅ Add-to-cart works end to end — badge and stepper update, no regression.
- ✅ `/health` returns 200 + `regionCount: 1` with the backend up.
- ✅ `/health` returns **503 + "backend unreachable"** with the backend stopped.
- ✅ With the backend stopped, GETs retried 3× then reported; the page still
  rendered 200 rather than crashing.
- ✅ Retry decision table: 20/20 assertions pass, including "503 on POST is
  never retried".
- ✅ Expected 401/404 noise confirmed suppressed after the reporting filter.
- ✅ **2026-08-02: retry logic now has a committed Vitest regression suite** —
  `apps/web/src/lib/util/resilient-fetch.test.ts`, 44 assertions, wired into
  CI (`pnpm --filter medusa-next test`, `.github/workflows/ci.yml`). Run
  locally with `pnpm --filter medusa-next test`. The gap noted below is closed.

### Former known gap (closed 2026-08-02)

~~`apps/web` had no test framework, so the retry logic was verified by a
one-off script rather than a committed regression test.~~ Vitest is now in
place, scoped to unit tests only (no jsdom/component testing yet — see
`apps/web/vitest.config.mts`). Extending coverage to components is future work,
not a blocker.
