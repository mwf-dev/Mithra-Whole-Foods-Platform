# End-to-End Flow — Gap Analysis and Implementation Plan

**Date:** 2026-08-07
**Scope:** turning the current storefront into a complete, maintainable
browse → cart → **multi-page checkout** → **PayPal payment** → **FedEx
shipping** → **automatic delivered status** → email + analytics loop.
**Status:** analysis and plan. Nothing in this document is implemented.

Everything in §1 was verified against the repo at commit `50ab0ea`; every
`file:line` reference was read, not assumed. External vendor claims in §4–§5
are sourced in §11 and carry an explicit confidence note.

Related documents this one builds on rather than repeats:
[`SHIPPING_AUTOMATION_RESEARCH.md`](SHIPPING_AUTOMATION_RESEARCH.md) (carrier
comparison, local-delivery zoning),
[`OBSERVABILITY_SETUP.md`](OBSERVABILITY_SETUP.md) (analytics wiring),
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) (pre-launch punch list),
[`AUDIT_2026-08-01_FRONTEND_PERF.md`](AUDIT_2026-08-01_FRONTEND_PERF.md)
(latency invariants).

---

## 0. The short version

Six gaps stand between today and "a real end-to-end product". In priority
order, worst first:

| # | Gap | Severity | Effort |
|---|---|---|---|
| 1 | **No PayPal.** Medusa v2 ships no PayPal provider. The storefront has an icon and a `pp_paypal_paypal` map entry, and nothing behind them. The client's stated primary payment method does not exist. | **Blocker** | 2–3 wks |
| 2 | **No delivery truth.** No fulfillment provider is registered at all; shipping is 100% manual and nothing ever moves an order to "delivered". | **Blocker** | 3–4 wks |
| 3 | **Emails are built and switched off.** `SENDGRID_API_KEY` unset → both subscribers no-op silently. Customers get *nothing* after paying. | **Blocker** | 1–2 days |
| 4 | **Stripe webhooks unverified.** `STRIPE_WEBHOOK_SECRET` unset → signatures not checked. | High | 1 hour |
| 5 | **Checkout is one long accordion page**, all four steps mounted at once, no progress indicator, no per-step loading. | Medium (UX) | 1–2 wks |
| 6 | **Analytics inert.** PostHog + Sentry fully wired, zero keys set. You are flying blind on the funnel you are about to rebuild. | Medium | 1 day |

**The sequencing that matters:** #3, #4 and #6 are *env vars for code that is
already written*. They are days of work with no engineering risk and they turn
on the instrumentation you need to judge whether #1, #2 and #5 actually
worked. Do them first. Do not start the checkout redesign (#5) before the
analytics are recording, or you will have no before/after.

---

## 1. Verified current state

### 1.1 Checkout is a single page with four accordion sections

[`checkout-form/index.tsx`](../apps/web/src/modules/checkout/templates/checkout-form/index.tsx)
renders all four steps as siblings:

```tsx
<Addresses cart={cart} customer={customer} />
<Shipping  cart={cart} availableShippingMethods={shippingMethods} />
<Payment   cart={cart} availablePaymentMethods={paymentMethods} />
<Review    cart={cart} />
```

Each child decides visibility from a query param — `searchParams.get("step")`
— and hides itself with `className={isOpen ? "block" : "hidden"}`
([payment/index.tsx:41,150](../apps/web/src/modules/checkout/components/payment/index.tsx#L41)).
So every step's DOM, state and effects exist on every render regardless of
which one the shopper is on.

Two consequences that matter more than the visual one:

- **`page.tsx` awaits `listCartShippingMethods` and `listCartPaymentMethods`
  before painting anything** — the address step waits on two backend calls it
  does not need
  ([checkout-form/index.tsx:20-21](../apps/web/src/modules/checkout/templates/checkout-form/index.tsx#L20)).
- **Step changes are already full server round-trips.** `router.push(pathname
  + "?step=payment")` on a dynamic route re-runs the server render (perf
  invariant #4). This is the key insight for §3: **moving to real routes costs
  nothing extra** — you are paying for the navigation today and getting none
  of the benefits.

Also found while reading:

- The checkout layout ([`(checkout)/layout.tsx`](../apps/web/src/app/[countryCode]/(checkout)/layout.tsx))
  has a back link and a wordmark and **no progress indicator whatsoever**.
- `Shipping.handleEdit`/`handleSubmit` do `router.push(pathname +
  "?step=delivery")`, discarding any other query params, while `Payment` uses
  a `createQueryString` helper that preserves them. Inconsistent; a latent bug
  the moment a second param exists (a coupon code, a UTM tag).
- Guests are redirected to sign in before checkout
  ([checkout/page.tsx:33-39](../apps/web/src/app/[countryCode]/(checkout)/checkout/page.tsx#L33)).
  That is a deliberate choice, but it is a known conversion cost and worth
  re-confirming with the client. Guest checkout is the single largest
  conversion lever in most grocery carts.

### 1.2 Payment: Stripe + COD only, PayPal is a dead icon

`medusa-config.ts:104-121` registers exactly one provider list: Stripe (plus
Medusa's built-in `pp_system_default`, surfaced as Cash on Delivery). The
storefront **already has** PayPal scaffolding with nothing behind it:

- `paymentInfoMap` has a `pp_paypal_paypal` entry with a PayPal icon
  ([constants.tsx](../apps/web/src/lib/constants.tsx))
- `isPaypal()` exists in the same file and **is never called anywhere**
- [`payment-button/index.tsx:29-44`](../apps/web/src/modules/checkout/components/payment-button/index.tsx#L29)
  switches on Stripe / manual and falls through to a **disabled** "Select a
  payment method" button for anything else

That last point is important: if you registered a PayPal provider on the
backend tomorrow, the storefront would list it, let the shopper select it, and
then present a permanently disabled Place Order button. Both halves are
needed.

### 1.3 Fulfillment: nothing automated, and no path to "delivered"

Confirmed by re-reading `medusa-config.ts` — `@medusajs/medusa/fulfillment` is
never pushed into `modules`, so Medusa falls back to `manual_manual`. The live
data (per `SHIPPING_AUTOMATION_RESEARCH.md` §1, verified 2026-08-01) is one
country-level `us` zone, two flat options, a fulfillment set still named
"European Warehouse delivery", and no pickup set.

The storefront **does** display `order.fulfillment_status`
([order-details/index.tsx:52](../apps/web/src/modules/order/components/order-details/index.tsx#L52)),
so the moment the backend knows an order is delivered, the customer sees it.
The gap is entirely on the backend side: nothing ever tells it.

**Good news, verified in `node_modules`:** Medusa 2.17.0 already ships the
exact primitive this needs.

- `markOrderFulfillmentAsDeliveredWorkflow` — input `{ orderId, fulfillmentId,
  no_notification? }`, in `@medusajs/core-flows`
  (`order/workflows/mark-order-fulfillment-as-delivered`)
- it emits **`delivery.created`** on success
  (`@medusajs/utils/dist/core-flows/events.js:811-820` — "Emitted when a
  fulfillment is marked as delivered")

So the FedEx integration does not need to invent a status model. It needs to
map a carrier webhook onto one existing workflow call. That is a much smaller
job than it sounds like, and §5 is built around it.

### 1.4 Email: written, correct, and off

Both subscribers are real and defensive:

- [`order-placed.ts`](../apps/backend/src/subscribers/order-placed.ts) — mints
  an `ORD-XXXXXX` number into order metadata, fires the authoritative
  `order_completed` analytics event, then sends customer + admin emails
- [`shipment-created.ts`](../apps/backend/src/subscribers/shipment-created.ts)
  — emails tracking numbers on `shipment.created`

Both resolve `Modules.NOTIFICATION` in a `try/catch` and `return` with a
warning when it is absent — which is the current state, because
`SENDGRID_API_KEY` is unset, so `medusa-config.ts:124` never registers the
module. **Customers currently receive no email at any point in the order
lifecycle.** There is no code bug to find here.

There is no `delivery.created` subscriber yet — that is the third email
(§6.2).

### 1.5 Analytics: complete pipeline, no keys

`src/lib/analytics/*` on the web side, `src/lib/analytics.ts` + PostHog Node on
the backend, Sentry on both, `GET /admin/usage` for cost metering. All of it
lazy-inits and no-ops without keys. `docs/OBSERVABILITY_SETUP.md` documents
the whole thing. Nothing to build; five env vars to set.

---

## 2. Recommended target architecture

```
                    ┌──────────────────────────────────────┐
  Storefront        │  /checkout/address                   │  real routes,
  (Next 15)         │  /checkout/delivery                  │  one step each
                    │  /checkout/payment                   │
                    │  /checkout/review                    │
                    └──────────────┬───────────────────────┘
                                   │ server actions → lib/data/cart.ts
                    ┌──────────────▼───────────────────────┐
  Medusa 2.17       │  payment module                      │
                    │    ├─ pp_stripe_stripe   (existing)  │
                    │    ├─ pp_paypal_paypal   (NEW §4)    │
                    │    └─ pp_system_default  (COD)       │
                    │  fulfillment module      (NEW §5)    │
                    │    ├─ manual   (local delivery/pickup)│
                    │    └─ fedex    (national parcel)     │
                    │  notification module     (turn on §6)│
                    └──────────────┬───────────────────────┘
                                   │
   inbound webhooks  ──────────────┤
     /hooks/payment/stripe_stripe  │  (exists, unverified — set the secret)
     /hooks/payment/paypal_paypal  │  NEW
     /hooks/shipping/fedex         │  NEW → markOrderFulfillmentAsDelivered…
                                   │
                    ┌──────────────▼───────────────────────┐
  Subscribers       │  order.placed      → email + analytics (exists)
                    │  shipment.created  → tracking email    (exists)
                    │  delivery.created  → delivered email   (NEW §6.2)
                    └──────────────────────────────────────┘
```

The load-bearing design decision: **every external system talks to Medusa
through a module provider or a webhook route, never directly into the
storefront.** That is what keeps this maintainable — see §8.

---

## 3. Workstream A — multi-page checkout

### 3.1 What to build

Replace the query-param accordion with four real routes under the existing
`(checkout)` group:

```
app/[countryCode]/(checkout)/checkout/
  layout.tsx          ← progress stepper + order summary (shared shell)
  page.tsx            ← redirect → ./address
  address/page.tsx    ← contact + shipping + billing address
  delivery/page.tsx   ← shipping method / pickup / local delivery
  payment/page.tsx    ← provider select + card or PayPal element
  review/page.tsx     ← line items, totals, Place Order
  loading.tsx         ← per-step skeleton
```

Each page fetches **only what its step needs**. The address step stops waiting
on `listCartShippingMethods` and `listCartPaymentMethods` entirely — that
alone removes two backend calls from the slowest, first-impression step.

### 3.2 Guard rails (each step must be entered legitimately)

Add a single server-side guard helper, e.g.
`modules/checkout/utils/require-step.ts`, called at the top of each page:

| Route | Requires | Else redirect to |
|---|---|---|
| `/address` | cart with ≥1 item | `/cart` |
| `/delivery` | `cart.shipping_address` and `cart.email` | `/checkout/address` |
| `/payment` | `cart.shipping_methods.length > 0` | `/checkout/delivery` |
| `/review` | a `pending` payment session | `/checkout/payment` |

This is strictly better than today: the accordion has no guard at all, it just
hides sections with CSS. A shopper can currently deep-link `?step=review` with
no address set and hit the `notReady` disabled button with no explanation
([payment-button/index.tsx:20-25](../apps/web/src/modules/checkout/components/payment-button/index.tsx#L20)).

### 3.3 Progress indicator, mobile and web

The client asked specifically about both viewports. One component, two
layouts — do **not** build two components:

- **Desktop (`small:` and up)** — horizontal stepper in the sticky
  `(checkout)/layout.tsx` header: `1 Address — 2 Delivery — 3 Payment —
  4 Review`. Completed steps are links back; future steps are inert. Order
  summary stays in the right rail, as today.
- **Mobile (< 640px)** — the four-dot stepper plus "Step 2 of 4 · Delivery" is
  enough; a full horizontal stepper does not fit. The order summary becomes a
  **collapsed sticky bar at the bottom** showing the total, expanding on tap.
  A fixed bottom CTA ("Continue to payment") is the single biggest mobile
  checkout win — never make a shopper scroll to find the primary action.

Note the codebase uses Tailwind's **custom `small:` breakpoint**, not `sm:` —
match the existing convention.

### 3.4 Cost analysis (this is why it's safe)

Per perf invariant #4, `router.push` on a dynamic route already costs a full
server round-trip, and every route in this app is dynamic because
`(main)/layout.tsx` reads cookies. Checkout is in the `(checkout)` group, which
does **not** have that layout — so these four routes have a genuinely smaller
server surface than the accordion, and each renders one step's worth of data
instead of four.

Expected net effect: **fewer** `/store/*` calls per checkout, not more. But
measure it — see §7. Keep server actions (`setAddresses`, `setShippingMethod`,
`initiatePaymentSession`) exactly where they are in `lib/data/cart.ts`; only
the routing and the components move. Per the cross-cutting rules, do not
inline any `fetch`.

### 3.5 Migration approach

Do this as a **strangler**, not a rewrite. The four step components already
exist and are individually sound; extract each one's body into its own page
and delete the `isOpen` / `hidden` machinery as you go. Ship behind the
existing route so you can revert by reverting one commit. Add the Vitest unit
tests for `require-step.ts` — it is pure logic and exactly the kind of thing
the existing `apps/web` Vitest setup was added for.

---

## 4. Workstream B — PayPal

### 4.1 The situation

**Medusa v2 has no official PayPal provider.** Medusa v1 did; it was not
carried forward. The v2 docs list Stripe as the documented third-party
integration plus the system provider. Community options exist but none are
credible for a production store handling a client's money:

| Option | Assessment |
|---|---|
| `@rd1988/medusa-payment-paypal` (DRX-1877) | Medusa 2.10+, Vault support, on npm — but **4 GitHub stars and 4 commits total**. One person, no track record. Read it as a reference implementation, do not depend on it. |
| `amaster507/medusa-payment-paypal` | Community v2 port, similarly thin. |
| Alphabite PayPal plugin | Listed on the Medusa integrations directory, commercial. Worth a pricing conversation if you would rather buy than build. |

**Recommendation: write your own provider module**, using the community repos
and Medusa's own `@medusajs/payment-stripe` (already in `node_modules`, read
it) as the two references. The interface is well defined and this is ~500
lines of well-trodden code. Owning it means you can upgrade it on your own
schedule, which for a payment path is the whole game.

### 4.2 Backend: `apps/backend/src/modules/paypal/`

Extend `AbstractPaymentProvider`. Required methods:

| Method | PayPal mapping |
|---|---|
| `initiatePayment` | `POST /v2/checkout/orders` with `intent: CAPTURE` → return the PayPal order id as `session.data.id` |
| `authorizePayment` | Verify the order is `APPROVED` after the shopper returns |
| `capturePayment` | `POST /v2/checkout/orders/{id}/capture` |
| `refundPayment` | `POST /v2/payments/captures/{id}/refund` |
| `cancelPayment` / `deletePayment` | Void; PayPal orders expire naturally, so these are mostly no-ops |
| `getPaymentStatus` | Map PayPal `CREATED/APPROVED/COMPLETED/VOIDED` → Medusa status |
| `retrievePayment` / `updatePayment` | `GET`/`PATCH` on the order |
| `getWebhookActionAndData` | **The critical one.** Verify the webhook signature, then return `{ action: "captured" \| "authorized" \| "failed", data: { session_id, amount } }` |

Registration slots into the existing conditional pattern in
`medusa-config.ts` — push a second entry into the same `payment` module's
`providers` array, gated on `PAYPAL_CLIENT_ID`:

```ts
if (process.env.PAYPAL_CLIENT_ID) {
  providers.push({
    resolve: "./src/modules/paypal",
    id: "paypal",
    options: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
      sandbox: process.env.PAYPAL_SANDBOX === "true",
    },
  })
}
```

⚠️ Note the current file *builds the whole payment module inside*
`if (process.env.STRIPE_API_KEY)`. That needs refactoring so the payment
module registers whenever **either** provider is configured — otherwise
PayPal silently disappears if Stripe keys are ever removed. Small change,
easy to get wrong.

Resulting provider id: **`pp_paypal_paypal`** — which is exactly the key
already sitting in `paymentInfoMap`. The storefront constants were written
in anticipation of this.

### 4.3 Storefront

Three edits, all small:

1. **`payment-button/index.tsx`** — add a `case isPaypal(...)` branch before
   the `default`, rendering a `PayPalPaymentButton` that renders PayPal's
   Smart Buttons via `@paypal/react-paypal-js` and calls the existing
   `placeOrder()` on approval. This is where `isPaypal()` finally gets used.
2. **`payment-wrapper/index.tsx`** — add a `PayPalScriptProvider` sibling to
   the existing `StripeWrapper`, mounted only when a PayPal session is active.
3. **`payment/index.tsx`** — the `RadioGroup` already renders any provider the
   backend returns via the non-Stripe `PaymentContainer` branch, so this may
   need **no change at all**. Verify rather than assume.

New dependency: `@paypal/react-paypal-js` in `apps/web` — the first addition
in a while; keep it to that one.

### 4.4 Webhook

`POST /hooks/payment/paypal_paypal` is provided by Medusa's payment module
once the provider is registered; your `getWebhookActionAndData` handles it.
**Verify the signature** using `PAYPAL_WEBHOOK_ID` via PayPal's
`/v1/notifications/verify-webhook-signature`. Do not repeat the Stripe
mistake of shipping with verification effectively disabled (§1.5 / gap #4).

### 4.5 Decisions the client must make

1. **PayPal only, or PayPal + cards?** PayPal's Advanced Checkout can process
   cards too — in which case Stripe could eventually be retired, one fewer
   vendor. But it needs separate approval and has different pricing. If the
   answer is "PayPal is primary but keep cards", keep Stripe and run both.
2. **Business account ready?** A verified PayPal **Business** account and a
   live app in the PayPal Developer Dashboard are prerequisites. Sandbox works
   without one and is where all development happens.
3. **PayPal fees vs Stripe** — both ~2.9% + fixed in the US, but PayPal's
   fixed component and cross-border rules differ. Worth a five-minute
   comparison against actual basket sizes before committing to PayPal-primary.

---

## 5. Workstream C — FedEx, and automatic "delivered"

This is the most interesting request and the one with the biggest gap between
"what it sounds like" and "what it takes". Splitting it into two independent
problems makes it tractable:

> **Problem 1 — labels.** Getting a shipment created with FedEx and a tracking
> number into the DB.
> **Problem 2 — status.** Learning that FedEx delivered it, and flipping the
> order.

They are separable. **Problem 2 can be solved first and alone**, which is
worth knowing because it is the client's actual stated pain and it is far
cheaper than Problem 1.

### 5.1 Problem 2 first: auto-mark-delivered (cheap, high value)

The chain you need:

```
tracking number stored on the fulfillment
        ↓
FedEx tells us "Delivered"        ← the only genuinely external piece
        ↓
find the fulfillment by tracking number
        ↓
markOrderFulfillmentAsDeliveredWorkflow({ orderId, fulfillmentId })
        ↓
Medusa emits  delivery.created
        ↓
new subscriber → delivered email + PostHog event
        ↓
storefront already renders order.fulfillment_status  ✅
```

Every link except the second one already exists in Medusa 2.17 (verified in
§1.3). So the whole question reduces to: **how do we learn about delivery?**

**Two ways, and I recommend starting with the second.**

#### Option A — FedEx Advanced Integrated Visibility webhook (push)

FedEx's real-time push product. Events from Label Creation through Delivered,
including picture proof of delivery. You configure a destination URL and a
security token; FedEx POSTs JSON.

Requirements and costs, per FedEx's own developer portal:

- A FedEx Developer Portal login **and an Organization profile**
- **Eligible U.S.-based billing and shipping account numbers** attached to that
  organization. Webhooks are "currently offered for US based billing and
  shipping accounts only," and a valid US FedEx account number must be
  associated with the webhook project for billing.
- **Paid**: billed monthly on the count of tracking numbers processed, invoiced
  in arrears. FedEx does not publish a public per-number rate — you have to ask
  them.
- Two subscription flavours: **Account Number Subscription** (every shipment on
  your account, no per-order registration — the one you want) and **Tracking
  Number Subscription** (register each number via API).

This is the right destination. It is also gated behind a commercial
conversation and a US FedEx account the business may not have yet.

#### Option B — poll the FedEx Track API on a schedule ✅ start here

The Basic Integrated Visibility (Track) API takes a tracking number and
returns status. Documented usage limit **100,000 calls/day** — vastly more
than this shop will ever need. A Medusa **scheduled job** (`src/jobs/`, a
first-class Medusa v2 primitive, currently a README-only placeholder in this
repo) runs every 30 minutes, lists fulfillments that are shipped-but-not-
delivered, batches their tracking numbers, and calls the workflow for any that
came back `DELIVERED`.

Why this first:

- **Works with test credentials today.** No org profile, no commercial
  negotiation, no US account gate.
- **The expensive half of the work is identical.** The tracking-number →
  fulfillment lookup, the workflow call, the idempotency, the delivered email,
  the analytics event — all shared. Swapping poll for push later is replacing
  the *trigger*, not the pipeline.
- **A 30-minute delay on a "delivered" notification is commercially
  irrelevant** for a grocery store. Nobody's day is changed by learning at
  2:30 instead of 2:05.
- If FedEx access stalls, the same job trivially points at UPS/USPS or an
  aggregator instead.

**Recommendation: build Option B, structure it so Option A is a drop-in
trigger swap, and open the FedEx Advanced Integrated Visibility conversation
in parallel** since that part is lead-time, not effort.

#### Shape of the code

```
apps/backend/src/
  lib/fedex/
    client.ts          OAuth token cache + typed Track/Ship calls
    status-map.ts      FedEx status code → { delivered: boolean }
  workflows/
    sync-delivery-status.ts   the shared pipeline (find → validate → mark)
  jobs/
    poll-fedex-tracking.ts    Option B trigger — cron, every 30 min
  api/hooks/shipping/fedex/
    route.ts                  Option A trigger — later, same pipeline
  subscribers/
    delivery-created.ts       NEW — delivered email + analytics
```

Four things to get right, all of which are the usual webhook/poller traps:

1. **Idempotency.** FedEx will report "Delivered" repeatedly. `markOrder
   FulfillmentAsDelivered` throws if the fulfillment is already delivered
   (`validateFulfillmentDeliverabilityStep`) — so catch and treat
   already-delivered as success, not as an error. Do not let it page you.
2. **Signature verification on the webhook route** when you add Option A.
   `/hooks/*` sits outside `/store/*`, so check the rate-limiter config in
   [`middlewares.ts`](../apps/backend/src/api/middlewares.ts) covers it — a
   public unauthenticated endpoint that mutates orders needs its own limiter
   and a shared-secret check. This is the highest-risk new surface in the
   whole plan.
3. **Never let the poller block or throw into a commerce flow** (perf
   invariant #10). Wrap it; report via `src/lib/observability.ts`.
4. **Tracking-number → fulfillment lookup.** Store it consistently. Medusa's
   fulfillment labels carry `tracking_number` and `tracking_url` — the
   `shipment-created` subscriber already reads exactly those fields
   ([shipment-created.ts:48-49](../apps/backend/src/subscribers/shipment-created.ts#L48)),
   so use the same path and add a DB index if the query gets slow.

### 5.2 Problem 1: FedEx labels (bigger, and possibly not worth it)

A `fedex` fulfillment provider module implementing
`AbstractFulfillmentProviderService` — the same interface `SHIPPING_
AUTOMATION_RESEARCH.md` §2 already tabulates. `calculatePrice()` hits FedEx
Rates & Transit Times; `createFulfillment()` hits the Ship API and returns the
label + tracking number.

**But read `SHIPPING_AUTOMATION_RESEARCH.md` §3 before committing.** That
document recommends **EasyPost** for this business, and its reasoning still
holds:

- EasyPost is multi-carrier — one integration covers FedEx *and* UPS/USPS.
  Direct FedEx locks you to one carrier forever, and grocery orders are
  dense (rice, oil) where carrier choice per parcel is real money.
- EasyPost's tracker webhooks solve Problem 2 for **all** carriers, with no US
  FedEx account gate and no per-tracking-number invoice.
- Direct FedEx is only clearly better if the business has **negotiated FedEx
  rates** that an aggregator cannot match.

**So the honest recommendation is a question, not an answer:** ask the client
*why* FedEx. If it is "that's who we use" → EasyPost with FedEx as a carrier
account gives them FedEx labels *and* the delivery webhook for free. If it is
"we have a negotiated FedEx contract" → direct FedEx, and note that EasyPost
also supports bring-your-own-carrier-account, so even then it's not clear-cut.

Either way, §5.1's pipeline is unchanged. That is the point of building the
trigger separately.

**Hard prerequisite for any of this:** products need real `weight` /
`length` / `width` / `height`. Live rating is impossible without them and the
catalog has no evidence of populated dimensions. Audit and backfill before
starting §5.2 — this is a data-entry task the client can do in parallel with
engineering, and it will otherwise become the thing that blocks the launch.

---

## 6. Workstream D — email

### 6.1 Turn on what exists (1–2 days, no code)

Set on Railway: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`,
`SENDGRID_ORDER_PLACED_TEMPLATE_ID`, `SENDGRID_ORDER_SHIPPED_TEMPLATE_ID`,
`SENDGRID_ADMIN_NEW_ORDER_TEMPLATE_ID`, `ADMIN_NOTIFICATION_EMAIL`.

Build three SendGrid dynamic templates against the handlebars contracts
already documented in the subscriber headers — `order-placed.ts:23-27` and
`shipment-created.ts:10-12` specify the exact variable names. Do not invent
new ones; match the code.

Also required and easy to forget: **domain authentication (SPF/DKIM) on
SendGrid for the sending domain.** Without it, order confirmations land in
spam and you will spend a week debugging a "missing email" bug that is a DNS
record.

### 6.2 The missing third email

Add `apps/backend/src/subscribers/delivery-created.ts` on the
`delivery.created` event (verified to exist, §1.3), mirroring
`shipment-created.ts`'s structure — same `try/catch` around
`Modules.NOTIFICATION`, same graceful no-op, same `no_notification` respect.
This is what closes the loop the client described: FedEx marks delivered →
customer gets "your order arrived" automatically.

### 6.3 Worth adding once the above works

Abandoned cart (needs a scheduled job + a cart-age query), review request
~7 days post-delivery (the `product-review` module already exists), password
reset (Medusa emits `auth.password_reset` — currently unhandled, which means
**password reset is silently broken today**; worth verifying and fixing
regardless of the rest of this plan).

---

## 7. Workstream E — analytics

Set `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_KEY`, `NEXT_PUBLIC_SENTRY_DSN`,
`SENTRY_DSN`, `STOREFRONT_PROXY_SECRET` per `OBSERVABILITY_SETUP.md`. One day.

Then, **before starting §3**, record a baseline for the funnel PostHog already
emits: `checkout_started` → `checkout_step_completed{address, delivery,
payment}` → `payment_method_selected` → `order_completed`. The step events are
already fired by the existing components
([payment/index.tsx:90-94](../apps/web/src/modules/checkout/components/payment/index.tsx#L90),
[shipping/index.tsx:126](../apps/web/src/modules/checkout/components/shipping/index.tsx#L126))
— so the multi-page rewrite has a directly comparable before/after with no new
instrumentation, **provided you keep the same event names and step values when
you move the code.** Write that down in the PR; it is the single easiest thing
to lose in a refactor.

Add two events the new flows need: `checkout_step_viewed` (you will finally be
able to distinguish viewed-from-completed once steps are real pages) and
`delivery_confirmed` from the new subscriber.

For "analytics in the backend" specifically: PostHog is the dashboard. The
Medusa admin is not an analytics tool and trying to make it one is a trap —
point staff at PostHog for funnels and revenue, and keep `GET /admin/usage`
for infrastructure cost.

---

## 8. Maintainability — the part that decides whether this survives

The single most important structural rule, and it is already the house style:

> **Every external system enters through a Medusa module provider or a webhook
> route. Never through the storefront.**

PayPal, FedEx, SendGrid, Stripe — each becomes a self-contained directory under
`apps/backend/src/modules/` or `src/lib/`, registered conditionally on an env
var in `medusa-config.ts`, and no-oping cleanly when unconfigured. That pattern
is already used six times in that file and it is why the app boots fine today
with SendGrid absent. Keep it. It means a future maintainer can delete PayPal
by removing one env var, and can develop locally without any vendor credentials
at all.

Concrete rules for this work:

1. **No vendor SDK in `apps/web`** except the ones that must run in the browser
   (Stripe Elements, PayPal Smart Buttons). Everything else server-side.
2. **All backend calls stay in `src/lib/data/*`.** No `fetch` in a component —
   this is an existing cross-cutting rule and the checkout rewrite is exactly
   where it tends to get broken.
3. **Each new integration gets a `README.md` in its module directory** stating
   which env vars gate it, what happens when they are absent, and which
   external endpoints it calls. Three paragraphs. This is what stops the next
   `CLAUDE.md` from going stale.
4. **Unit-test the pure logic**, which for this work is the valuable half:
   FedEx status → delivered mapping, the checkout step guard, PayPal amount
   conversion (PayPal wants decimal strings, Medusa uses a different
   representation — this is a classic money bug and it belongs in a test).
   `apps/backend` has Jest, `apps/web` has Vitest. Both are in CI.
5. **Extend `.env.template`** with placeholders for every new variable —
   `PAYPAL_*`, `FEDEX_*`. Never a value. Given this repo's credential history,
   treat this as non-negotiable.
6. **Update `CLAUDE.md`'s infrastructure table** in the same PR that changes
   infrastructure. That table is the fastest orientation tool in the repo and
   it is only useful while it is true.

Two pieces of existing debt worth clearing while you are in here, because both
will actively fight this work:

- **Design-system drift** (`PRODUCTION_ROADMAP.md` §3) — two greens, three
  creams, two button systems. A four-page checkout makes inconsistent buttons
  four times as visible. Reconcile the tokens *during* the checkout rewrite,
  not after.
- **The pagination bug** — `listProductsWithSort` fetches 100 to render 12 and
  silently returns empty pages past product 100
  ([products.ts:115](../apps/web/src/lib/data/products.ts#L115)). Masked by a
  ~54-product catalog. It will break on the day the catalog grows, which is
  the day everyone is looking.

---

## 9. Sequencing

**Phase 0 — switch on what is already built (week 1, ~3 days, no new code)**
1. SendGrid keys + three dynamic templates + domain authentication (§6.1)
2. `STRIPE_WEBHOOK_SECRET`
3. PostHog + Sentry + `STOREFRONT_PROXY_SECRET` keys (§7)
4. Record the checkout funnel baseline
5. Rename the "European Warehouse delivery" fulfillment set

*Highest value per hour in this entire document. Nothing below is worth
starting first.*

**Phase 1 — PayPal (weeks 2–4)**
6. Refactor `medusa-config.ts` so the payment module isn't Stripe-gated
7. Build `src/modules/paypal/`, sandbox first
8. Storefront button + wrapper (§4.3)
9. Webhook signature verification
10. End-to-end sandbox test: order → capture → refund

**Phase 2 — delivery status (weeks 3–5, parallel with Phase 1)**
11. FedEx developer account, test credentials, Track API sandbox call
12. `sync-delivery-status` workflow + idempotency
13. `poll-fedex-tracking` scheduled job
14. `delivery-created.ts` subscriber → delivered email
15. *In parallel, non-engineering:* open the FedEx Advanced Integrated
    Visibility conversation, and decide FedEx-direct vs EasyPost (§5.2)

**Phase 3 — multi-page checkout (weeks 5–7)**
16. Route split + step guards (§3.1–3.2)
17. Progress stepper, desktop and mobile (§3.3)
18. Per-step loading states
19. Compare the funnel against the Phase 0 baseline. **If conversion dropped,
    the redesign failed — revert it.** Say this out loud before starting.

**Phase 4 — labels (weeks 8+, only after the §5.2 decision)**
20. Product weights/dimensions backfill *(client-side data entry — start this
    in week 1, it has a long tail)*
21. Fulfillment provider module, `calculatePrice` cached in Redis
22. Local Exton zone + pickup set per `SHIPPING_AUTOMATION_RESEARCH.md` §5

**Rough total: 7–9 weeks of engineering**, with Phases 1 and 2 genuinely
parallelizable and Phase 0 unblocking real revenue signal in days.

---

## 10. Decisions needed from the client

Engineering is blocked on none of these today, but each one changes the shape
of a phase, so get them answered early:

1. **PayPal only, or PayPal + card?** (§4.5) — determines whether Stripe stays.
2. **Is there a verified PayPal Business account?** Sandbox work can start
   without it; go-live cannot.
3. **Why FedEx specifically?** (§5.2) — negotiated contract, or habit? This is
   the single highest-leverage question in the document.
4. **Does the business have a US FedEx billing account?** Hard gate on the
   push-webhook option.
5. **Guest checkout — yes or no?** Currently forced sign-in (§1.1). Real
   conversion cost.
6. **Which ZIPs are "local"?** Still open from
   `SHIPPING_AUTOMATION_RESEARCH.md` §6. Blocks the Exton zone.
7. **Who enters product weights?** Blocks calculated rates entirely (§5.2).
8. **Free-shipping threshold?** The UI nudge component is already wired; the
   rule is undefined.

---

## 11. Sources

Medusa (verified against installed `@medusajs/*` 2.17.0 where noted):
- [How to Create a Payment Provider — Medusa](https://docs.medusajs.com/resources/references/payment/provider)
- [Payment Provider overview — Medusa](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider)
- [How to Create a Fulfillment Module Provider — Medusa](https://docs.medusajs.com/resources/references/fulfillment/provider)
- [Manage Order Fulfillments — Medusa Admin User Guide](https://docs.medusajs.com/user-guide/orders/fulfillments)
- `markOrderFulfillmentAsDeliveredWorkflow` and the `delivery.created` event
  were read directly from `node_modules/@medusajs/core-flows` and
  `@medusajs/utils` at 2.17.0 — **verified, not inferred**

FedEx (vendor claims — re-verify commercial terms directly before committing):
- [Basic Integrated Visibility (Track API) — FedEx Developer Portal](https://developer.fedex.com/api/en-us/catalog/track.html) — 100,000 calls/day usage limit
- [Advanced Integrated Visibility — Tracking Number Subscription](https://developer.fedex.com/api/en-ao/catalog/tracking-number-subscription.html)
- [Advanced Integrated Visibility — Account Number Subscription](https://developer.fedex.com/api/en-us/catalog/account-number-subscription.html)
- [Shipment Visibility Webhook Service Description](https://developer.fedex.com/api/en-us/legal/ShipmentVisibilityWebhookServiceDescription.html) — monthly billing on tracking-number count
- [FedEx Webhook Marketing](https://developer.fedex.com/api/en-us/webhookmarketing.html) — US-only accounts, org profile requirement

PayPal for Medusa v2 (community, thin — assess before adopting):
- [DRX-1877/medusa-payment-paypal](https://github.com/DRX-1877/medusa-payment-paypal) — npm `@rd1988/medusa-payment-paypal`, Medusa 2.10+, 4 stars / 4 commits
- [amaster507/medusa-payment-paypal](https://github.com/amaster507/medusa-payment-paypal)
- [Alphabite PayPal — Medusa integrations directory](https://medusajs.com/integrations/alphabite-paypal/)

Carrier aggregators (see `SHIPPING_AUTOMATION_RESEARCH.md` §3 for the full
comparison):
- [Shipping API Comparison 2026: EasyPost vs Shippo vs ShipEngine — RevAddress](https://revaddress.com/blog/shipping-api-comparison-2026/)
- [Shippo vs EasyPost in 2026 — Ecommerce Paradise](https://ecommerceparadise.com/shippo-vs-easypost-2026/)

*All vendor pricing and eligibility above comes from vendor pages or
comparison articles dated 2026 and must be re-verified against the vendor's
own current terms before any commercial commitment. FedEx does not publish a
per-tracking-number webhook rate — that requires a direct conversation.*
