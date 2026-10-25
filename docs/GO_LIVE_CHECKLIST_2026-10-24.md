# Go-live checklist: real checkout on a staging site first (2026-10-24)

Goal: prove the whole order path (checkout, payment, delivery, tracking, email)
on a separate staging site, leave production untouched with orders locked, then
promote.

Sources: code on `deployed-main` (4f67678), `docs/PRODUCTION_READINESS_2026-10-08.md`,
and the notes from the 10-09/10-10 phases. Items marked **verify** were not
re-tested today.

---

## 1. What already exists (so we don't rebuild it)

| Your ask | State |
|---|---|
| Guest checkout (email + phone, no account) | Built and live as of 10-09 (phone required, E.164). Verify on staging. |
| Sign up with email + password | Built. Password reset also built (`/forgot-password`, `/reset-password`). |
| Guest order tracking | `/track` + `POST /store/order-lookup` (order number + phone, rate limited). |
| Stripe payments | Backend active. Needs webhook secret and storefront key (below). |
| Easyship courier + label | Provider in `modules/fulfillment-easyship` (rates, label purchase, void). Admin **Ship orders** page buys the label and prints packing slips and invoices. |
| Easyship webhook to track delivery | `/webhooks/easyship` is signature-checked and fails closed. It only acts on **delivered**. |
| Resend email | `modules/notification-resend` and templates exist. Active only when `RESEND_API_KEY` is set. |
| Analytics | PostHog and Sentry are wired but inert until keys are set. |
| Orders locked on production | `ORDERS_OPEN` (backend) and `NEXT_PUBLIC_ORDERS_OPEN` (storefront), both default closed. |

## 2. What is genuinely missing (code work)

**Status 2026-10-25 (branch `staging`): C1–C9 are ALL built — C5 (ops log: admin → "Ops log" page with filters and one-click retry for failed emails/webhooks Easyship events) and C9 (signed guest invoice link: `invoice_url` button in the confirmation email → `GET /invoice/:id?t=<hmac>`) landed today. Everything passes typecheck, lint and unit tests but has **not yet been exercised against real Easyship/Resend/Stripe: that is what staging is for.** Setup steps: `docs/STAGING_SETUP.md`.**

| # | Item | Why |
|---|---|---|
| C1 | **Per-order delivery choice: Manual vs Courier**, picked by staff in Ship orders after the order is placed | Today the method is fixed by the shipping option the shopper picked, and the storefront hides the Easyship options (`checkout/components/shipping/index.tsx:90`). Needed: a Manual / Courier switch per order. Courier buys the Easyship label. Manual creates the fulfillment, the packer records the driver, a note and optionally a tracking ref, and "Mark delivered" is a button. |
| C2 | **Store every tracking status**, not only delivered | The webhook ignores `in_transit`, `out_for_delivery` and `exception`. Save each one with a timestamp on the fulfillment metadata. |
| C3 | **Tracking timeline for the customer** (account order page and `/track`) with carrier link | The account order page shows only a status word. |
| C4 | Emails for shipped, delivered, out-for-delivery and manual-delivery "on its way" | Subscribers exist for placed, shipped, delivered. Add manual-delivery variants and cancel/refund. Verify the templates render. |
| C5 | ~~**Ops log + stuck-orders page**~~ **BUILT 2026-10-25** (admin → "Ops log"; emails, Easyship webhooks and label events recorded with one-click retry; super-admin only) | (was) Nothing persisted webhook or email attempts, so a failed email was invisible. |
| C6 | Show the Easyship fallback-rate event in Sentry, not just the log | A silent flat rate hides a broken Easyship key. |
| C7 | "Coming soon" products listed before purchasable ones on `/store` | New visitors see two pages with nothing to buy. |
| C8 | Cash on Delivery on courier orders (`pp_system_default`) — **DECIDED, enforced in code** (2026-10-24): the Ship orders fulfill step REFUSES courier dispatch on a pay-on-delivery order unless `ALLOW_COD_COURIER=true`; COD orders go by manual delivery so our driver collects the cash. | Who collects the cash on a courier shipment? Hide it unless the order is manual delivery. |
| C9 | ~~Order-confirmation, track and invoice flow for guests: signed invoice link~~ **BUILT 2026-10-25** (`invoice_url` HMAC button in the confirmation email → `GET /invoice/:id?t=…`) | (was) Invoice route needed a logged-in customer. |

## 3. Staging architecture (nothing exists yet)

Rule: staging must **never** share production's database, Stripe keys or
Easyship key. (Local `.env` points at the prod Neon DB, so never place orders
from a laptop either.)

```
production   mithrawholefoods.com        Railway env "production"   Neon main        Stripe LIVE   ORDERS_OPEN unset (locked)
staging      staging.mithrawholefoods.com  Railway env "staging"    Neon branch      Stripe TEST   ORDERS_OPEN=true
             staging-api.mithrawholefoods.com (backend + admin)
```

Steps:
1. Neon: create a branch `staging` from main (copy of the catalog and no real orders). Use its pooled URL as `DATABASE_URL` and its direct URL as `DATABASE_URL_DIRECT`.
2. Railway project `friendly-elegance`: add environment `staging` (duplicate production), point both services at branch `staging`, and set the variables in section 4.
3. Git: create a `staging` branch from `deployed-main`. Push to the `platform` remote. Railway auto-deploys per service by watch path. Pushing to prod's branch stays a separate, deliberate step.
4. DNS: CNAME `staging` and `staging-api` to the Railway domains. Add both domains in Railway (custom domain), then add the URLs to the backend's `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`.
5. Medusa: run `db:migrate` against the staging branch, create an admin user, create a **new publishable key** for staging and set it on the staging storefront.
6. Add a robots `noindex` on staging (env flag) so Google never indexes it.

## 4. Environment variables

**Staging backend:** `DATABASE_URL`, `DATABASE_URL_DIRECT`, `JWT_SECRET`, `COOKIE_SECRET` (new, not the prod values), `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`, `STOREFRONT_URL`, `REVALIDATE_SECRET`, `STRIPE_API_KEY` (`sk_test_…`), `STRIPE_WEBHOOK_SECRET` (from the staging endpoint `https://staging-api…/hooks/payment/stripe_stripe`), `RESEND_API_KEY`, `RESEND_FROM`, `ADMIN_NOTIFICATION_EMAIL`, `EASYSHIP_API_KEY` (**sandbox** key), `EASYSHIP_WEBHOOK_SECRET`, `CLOUDINARY_*`, `ORDERS_OPEN=true`, `SUPER_ADMIN_EMAILS`. Leave `REDIS_URL` and `TRACKING_DEMO_ENABLED` unset.

**Staging storefront:** `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (staging key), `NEXT_PUBLIC_DEFAULT_REGION=us`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_STRIPE_KEY` (`pk_test_…`), `NEXT_PUBLIC_ORDERS_OPEN=true`, `REVALIDATE_SECRET`, optional `NEXT_PUBLIC_POSTHOG_KEY` (separate PostHog project or tag env), `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `STOREFRONT_PROXY_SECRET`.

**Production (later):** same list with live keys. Keep `ORDERS_OPEN` and `NEXT_PUBLIC_ORDERS_OPEN` unset until the day you open.

## 5. Staging test script (all must pass)

Easyship-specific script (label purchase, carrier-side status sync from the
Easyship dashboard, webhook replay, signed guest invoice): **see
`docs/EASYSHIP_STAGING_TEST_2026-10-25.md`** — run it alongside this list.

1. Guest: add to cart, checkout with email + phone, Stripe test card `4242 4242 4242 4242`, order confirmed, confirmation email arrives (Resend).
2. Account: sign up with email + password, order again, saved address prefilled, password reset email works.
3. Admin Ship orders, **Courier**: buy an Easyship sandbox label, packing slip prints, shipment email arrives with tracking.
4. Easyship webhook: simulate in-transit then delivered from the Easyship sandbox. Each status shows on `/track` and the account page. Delivered email arrives. Re-sending the same event does not duplicate the email.
5. Admin Ship orders, **Manual**: choose Manual, mark out for delivery, mark delivered, emails arrive.
6. Forged webhook (no signature) is rejected with 401.
7. Refund a test payment from admin, cancel email arrives.
8. Rate-limit and error path: wrong card, expired cart, out-of-stock item each show a clear message.
9. Mobile pass on iPhone width for cart, checkout, tracking.
10. PostHog shows the funnel events (view, add to cart, checkout started, order completed). Sentry receives a deliberate test error.

## 6. Production cutover (only after section 5 passes)

1. Merge `staging` to `deployed-main`, push `platform` main, approve the Railway deploy.
2. Swap in live Stripe keys, create the live Stripe webhook, set the live Easyship key and webhook.
3. One real $1–2 order, then refund and void the label.
4. Rotate any credential that was ever committed (see `CLAUDE.md`, credential history). Confirm Neon point-in-time restore window. Confirm `MEDUSA_FF_RBAC` is not `true` on Railway.
5. Set `ORDERS_OPEN=true` and `NEXT_PUBLIC_ORDERS_OPEN=true`, redeploy both.

---

## 7. Your list (things only you can do)

1. **Decide the staging hostname.** I assumed `staging.mithrawholefoods.com` (you said "d.", probably `dev.`). Tell me if you prefer `dev.`.
2. **DNS:** add the two CNAMEs in your registrar when I give you the targets.
3. **Neon:** create the `staging` branch (or give me the go-ahead to do it if you connect the Neon connector).
4. **Railway:** create the `staging` environment and add the variables from section 4. I cannot see or approve deploys in Railway.
5. **Stripe:** stay in test mode. Create the staging webhook endpoint and give me nothing. Paste the `whsec_…` into Railway yourself.
6. **Resend:** add the domain, add the SPF and DKIM DNS records, create the API key, choose the From address.
7. **Easyship:** create a sandbox key and a webhook pointing to the staging backend, set the same secret in both places. Confirm the Exton ship-from address.
8. **Business decisions:** Cash on Delivery on courier orders, manual-delivery radius or ZIP list, who the manual driver is, refund policy wording.
9. **PostHog and Sentry:** create projects and send the keys to Railway (not chat).
10. **Admin accounts:** create your super-admin login (`npx medusa user -e … -p …` against the staging DB, not prod) and set `SUPER_ADMIN_EMAILS`.

Never paste secrets into chat or commit them. Put them straight into Railway.
