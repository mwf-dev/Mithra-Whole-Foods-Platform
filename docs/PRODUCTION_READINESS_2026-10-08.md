# Production Readiness Audit — 2026-10-08

Scope: the **deployed** system (Railway `friendly-elegance`, storefront
`mithra-wholefoods.up.railway.app`, backend `backend-production-719a4.up.railway.app`,
code = `platform/main` = local `deployed-main`).

Method: code read on `deployed-main` + live HTTP probes + a real-browser
walkthrough (store → PDP → add to cart → checkout). No account was created and
no order was placed on production. Anything marked *unverified* needs a test
order to confirm.

Legend: ✅ works · ⚠️ partial / risky · ❌ missing · 🔴 security or data risk

---

## 0. The short version

The **browse → cart** half is in good shape. The **checkout → after-sale** half
is not yet production grade. Before taking real orders, three things must be fixed:

1. 🔴 **Anyone on the internet can mark real orders shipped or delivered.**
   - `/webhooks/easyship` skips signature verification when the signature header is absent. Live probe: an unsigned `POST` returned `200 {"received":true}`.
   - `/tracking-demo/ship` and `/tracking-demo/deliver` are public, run the real workflows, and are live (`GET /tracking-demo` → 200).
   - Either one fires customer emails once email is switched on.
2. ❌ **Guests cannot check out, and there is no password reset.** Checkout
   redirects every guest to Sign in (confirmed in the browser). No forgot-password
   flow exists anywhere in the code, so a returning shopper who forgets their
   password cannot buy at all.
3. ❌ **No email is sent.** There is no Resend integration, and SendGrid is
   registered only when `SENDGRID_API_KEY` is set (it isn't). The order, shipped
   and delivered subscribers exist but run without sending anything.

---

## 1. Shopper journey (module by module)

| # | Step | Status | Evidence / gap |
|---|---|---|---|
| 1 | **Landing / speed** | ✅ | Homepage TTFB 0.55s, 0.77s total, ~690 KB HTML. `/store` TTFB 0.40s. Backend `/health` 0.39s. Storefront → backend 761 ms (from `/health`). Both now on Railway us-east4 next to Neon, so the 290 ms cross-continent hop from Aug is likely gone. **Not yet re-measured: DB-heavy calls (`/store/products` with prices).** |
| 2 | **Browse / store listing** | ⚠️ | ~26 products are **"Coming soon / price will be announced"**, and they fill **pages 1–2 of `/store`**. A new visitor's first two pages contain nothing they can buy. Sort purchasable products first, or hide unpriced ones from the default listing. |
| 3 | **Product page** | ⚠️ | Works. Still does the `router.replace(?v_id=…)` on mount (URL changes after load), so every single-variant PDP renders twice (perf invariant #4). |
| 4 | **Search** | ✅ | In-house `/store/search`. |
| 5 | **Add to cart / cart** | ✅ | Local-first optimistic cart; badge updated. |
| 6 | **Checkout entry** | ❌ | `app/[countryCode]/(checkout)/checkout/page.tsx:33` redirects guests to `/account`. **Guest checkout missing** (see §2). |
| 7 | **Sign in / sign up** | ⚠️ | Works. **No password reset** (no page, no `auth.password_reset` subscriber). Auth limiter is 20 attempts / 15 min **per IP**, which behind SSR is effectively shared across all shoppers. |
| 8 | **Address step** | ✅ | US autocomplete (Photon + Zippopotam), phone field exists (`shipping_address.phone`), but phone is **not required or normalised**. |
| 9 | **Shipping step** | ⚠️ | EasyShip provider (`modules/fulfillment-easyship`) does live rates with a **silent fallback rate** if EasyShip fails (`easyship-fulfillment.ts:158`). The fallback is good for conversion, but it's only logged as a warning, not reported to Sentry. *Unverified on prod:* whether `EASYSHIP_API_KEY` is set and whether shipping options in the DB point at the EasyShip provider rather than `manual_manual`. |
| 10 | **Payment** | ⚠️ | Stripe + "Cash on Delivery" (`pp_system_default`). **`STRIPE_WEBHOOK_SECRET` unset**, so async payment events aren't verified. *Unverified:* `NEXT_PUBLIC_STRIPE_KEY` on the Railway storefront (it was missing at the 2026-09-29 handoff). **PayPal (client's stated primary) does not exist.** COD on a shipped-by-courier store needs a business decision: who collects the cash? |
| 11 | **Order placed** | ⚠️ | `order-placed` subscriber assigns `ORD-xxxxxx` (random, no uniqueness check — low collision risk but non-zero) and fires analytics. Emails are a no-op (§3). |
| 12 | **Confirmation page** | ✅ | `/order/[id]/confirmed`. |
| 13 | **Order tracking (customer)** | ❌ | The account order page shows only a status word (`order-details/index.tsx:52`). **No tracking number, no carrier link, no timeline**, and no tracking page for guests. |
| 14 | **Invoice** | ⚠️ | `/store/orders/*/invoice` requires a logged-in customer (`middlewares.ts:100`). Once guest checkout ships, guests need another way in, such as a signed link in the email. |
| 15 | **Legal pages** | ❌ | `privacy-policy`, `terms`, `shipping-policy`, `refund-policy` all **404**. Stripe and card networks expect these, and food sales especially need a refund/shipping policy. |

---

## 2. Guest checkout — design

**Medusa already supports guest orders natively.** A cart with an `email` completes
into an order whose customer has `has_account=false`. The only thing blocking it
is our redirect. So this is a small change, not a rebuild.

**What guests can / cannot do** (as you specified):

| Feature | Guest | Account |
|---|---|---|
| Place order (Stripe / COD) | ✅ | ✅ |
| Track order | ✅ (order no. + phone) | ✅ (account page) |
| Order emails | ✅ | ✅ |
| Wishlist, reviews, saved addresses, order history, buy-again | ❌ (already auth-gated) | ✅ |

**About "mobile number as the unique key".** Use phone as the guest **lookup key**,
not as the **identity**. Here's why:

- Medusa keys customers by **email**. Stripe receipts and all notification emails
  need an email, so email stays required.
- Phone numbers get recycled and mistyped. If phone alone opened an order, anyone
  who knows your number could see your address. **Tracking lookup = order number
  + phone, both required** (or phone + SMS OTP later).
- Normalise to E.164 (`+1XXXXXXXXXX`) at checkout. Store it on
  `shipping_address.phone` **and** `order.metadata.guest_phone` (indexed lookup).
- When a guest later signs up with the same email or phone, offer to **attach past
  orders**. The `order/[id]/transfer` route and Medusa's order-transfer workflow
  already exist.

**Work:** remove the redirect and add an "Continue as guest / Sign in" choice →
require email + phone for guests → `/track` page + backend lookup route
(rate-limited) → signed invoice link. **Estimate: ~2–3 days.**

---

## 3. Notifications

### Email (Resend) — feasible, recommended
- The subscribers are already written: `order-placed` (customer + admin alert),
  `shipment-created`, `shipment-delivered`. They call Medusa's notification module,
  so switching SendGrid → Resend means **adding a Resend notification provider**
  (small custom module, `resend` SDK + React Email templates) and pointing
  `medusa-config.ts` at it. No subscriber rewrite is needed.
- Emails missing today that a production store needs: **password reset**,
  order canceled, refund issued, and a welcome email (optional).
- Prerequisites: verify `mithrawholefoods.com` in Resend (SPF + DKIM DNS records),
  `RESEND_API_KEY`, `RESEND_FROM`. Free tier covers launch volume (check current
  limits).
- **Estimate: ~2 days** including templates.

### WhatsApp — feasible as a paid add-on
- Route: Meta WhatsApp Cloud API directly (cheapest) or Twilio (simpler, extra
  per-message fee).
- Needs: Meta Business verification, a dedicated number, and **pre-approved
  "utility" templates** (order confirmed / shipped / delivered), plus an explicit
  opt-in checkbox at checkout.
- The code part is easy: the same three subscribers, about 2 days of work. The
  **calendar risk is Meta's approval** (days to weeks).
- Meta charges per message and its pricing changes often, so check current rates.
  Sell it to the client as an add-on with pass-through message cost.

---

## 4. Fulfillment, shipping & tracking (EasyShip)

| Item | Status |
|---|---|
| Live rate quote at checkout | ✅ coded (`calculatePrice`), fallback on failure |
| Label purchase on "Create fulfillment" | ✅ coded (`createFulfillment` returns tracking no. + label URL) |
| Void label on cancel | ✅ coded |
| Returns | ❌ `createReturnFulfillment` returns empty |
| Delivered status via webhook | ✅ coded, 🔴 **unsigned requests accepted** (`api/webhooks/easyship/route.ts:52` only verifies `if (webhookSecret && signatureHeader)`; it also accepts any signature if the secret is unset) |
| In-transit / exception statuses | ❌ only "delivered" is acted on; nothing is stored or shown for in-transit or exception |
| FedEx webhook | ✅ correctly rejects missing signature |
| Public tracking-demo (ship/deliver) | 🔴 live and unauthenticated; **must be removed or put behind admin auth before real orders** |
| Customer-facing tracking | ❌ see §1 #13 |

**Can we place real orders end-to-end today?** Not safely. Payments likely work
(Stripe active on backend; storefront key unverified). But a shopper gets no
email, can't see tracking, and the delivered status can be forged.
**Needed:** one supervised **real $1–2 test order** after the fixes in §7
Phase 1. It should go all the way through to a purchased EasyShip label, then be voided.

**Tracking design:** save every webhook status (`in_transit`, `out_for_delivery`,
`exception`, `delivered`) with a timestamp into fulfillment metadata, then render a
timeline + carrier tracking link on the account order page and the guest
`/track` page. ~1.5 days.

---

## 5. Admin — two tiers

**Today:** every admin user sees everything, including the Infrastructure portal,
which holds encrypted vendor tokens, budgets and usage. There is no role
separation. The default admin was `admin@medusa-test.com` with a weak password at
handoff; *confirm it was changed.*

**Medusa 2.17 ships RBAC** (`@medusajs/rbac` is installed), but it is
**experimental and off** (`MEDUSA_FF_RBAC`, default `false`).

**Recommendation: don't depend on the experimental flag for launch.** Use a small,
reliable gate:

- `SUPER_ADMIN_EMAILS` env var.
- One middleware on `/admin/platform*`, `/admin/usage`, and future dev routes
  returns 403 unless the logged-in admin's email is on that list.
- The admin UI routes for Infrastructure / logs hide themselves for non-super users.

**Client admin (store manager)** gets the standard Medusa admin: orders,
fulfillment, products, inventory, customers, discounts, reviews, homepage CMS,
content briefs.

**Super admin (you)** gets all of the above plus:

| Capability | Exists? |
|---|---|
| Infrastructure portal (vendor usage, cost, budgets, endpoint verification) | ✅ `admin/routes/platform` |
| Request/usage metrics | ✅ `/admin/usage` |
| Error tracking | ⚠️ Sentry wired, **DSN unset** |
| Product analytics / funnel | ⚠️ PostHog wired, **keys unset** |
| Logs viewer | ❌ only `railway logs` |
| "Stuck order" console: orders paid-but-unfulfilled, fulfilled-but-not-shipped > N days, failed webhooks, failed emails, with retry buttons | ❌ |
| Webhook / notification event log | ❌ nothing persists webhook or email attempts |

The "fix anything from the super admin" goal comes down to two pieces: an **ops
event log** (every webhook received, email or WhatsApp sent or failed, label
purchased) and a **stuck-orders page** with retry actions. **~3–4 days.**

---

## 6. Platform / reliability

| Item | Status |
|---|---|
| Redis | ❌ off in prod → in-memory event bus: **subscriber events in flight are lost on restart / redeploy** (e.g. an order email). Fix exists locally, uncommitted (`src/modules/event-bus-redis` wrapper + `medusa-config.ts`). |
| Secrets in old git history | ⚠️ new repo was squashed, but every key ever committed to `mwf-dev` must still be **rotated** |
| `STOREFRONT_PROXY_SECRET` | ⚠️ unset → `/store/*` rate limit is still site-wide |
| Backups | *unverified* — confirm Neon PITR window on the plan |
| Uptime alerting | ⚠️ `keep-warm` + platform-monitor exist; no pager / Slack alert configured |
| Storefront `/health` `commit` | ⚠️ returns `null` on Railway (was a Vercel env), so you can't tell from the site which build is live |

---

## 7. Plan (proposed order)

**Phase 1 — Safe to take a real order (≈3–4 days)**
1. Close the forged-delivery holes: require a valid signature on `/webhooks/easyship` (reject when the header is missing, fail closed when the secret is unset), and remove `/tracking-demo` or put it behind admin auth.
2. Resend email provider + templates: order confirmed, shipped, delivered, admin new-order alert, **password reset**.
3. Password reset flow (storefront pages + subscriber).
4. Set `STRIPE_WEBHOOK_SECRET`; verify `NEXT_PUBLIC_STRIPE_KEY` and `EASYSHIP_API_KEY` / `EASYSHIP_WEBHOOK_SECRET` on Railway.
5. Ship the Redis event-bus fix and set `REDIS_URL`.
6. Legal pages (privacy, terms, shipping, refund).
7. **One supervised real test order** (Stripe → EasyShip label → webhook → email), then refund and void.

**Phase 2 — Shopper completeness (≈4–5 days)**
8. Guest checkout + phone-keyed `/track` page + signed invoice link (§2).
9. Tracking timeline on account and guest pages (§4).
10. Purchasable products first on `/store`; hide or segregate "Coming soon".
11. Decide COD policy for courier-shipped orders.

**Phase 3 — Two-tier admin + ops console (≈3–4 days)**
12. `SUPER_ADMIN_EMAILS` gate on dev routes and UI.
13. Ops event log (webhooks, notifications, labels) + stuck-orders page with retry.
14. Turn on Sentry + PostHog keys; Slack alerts from platform-monitor.

**Phase 4 — Paid add-ons**
15. WhatsApp notifications (after Meta approval).
16. PayPal (client's stated primary; still not built).
17. Returns via EasyShip.

## Open decisions for the founder / client
- COD: allowed for courier shipping, local Exton only, or dropped?
- PayPal: still "primary"? It isn't built.
- WhatsApp: in scope and billed to the client?
- Remove `/tracking-demo` entirely, or keep it admin-only for client demos?
