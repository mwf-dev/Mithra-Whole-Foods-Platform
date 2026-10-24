# Staging setup: staging.mithrawholefoods.com

Purpose: test the whole checkout (guest + account, Stripe, Easyship, Resend,
tracking, refunds) with test money, while production stays locked.

Everything here is a dashboard action or a DNS record, so it is yours to do.
The code already supports it: branch `staging`, `NEXT_PUBLIC_NOINDEX`,
`ORDERS_OPEN` / `NEXT_PUBLIC_ORDERS_OPEN`, Easyship sandbox auto-detection
(a key starting `sand_`), and CI already runs on pushes to `staging`.

## Security rules (read first)

1. **Separate everything.** Staging gets its own database, its own `JWT_SECRET` and `COOKIE_SECRET`, its own Stripe **test** keys, its own Easyship **sandbox** key, its own Medusa publishable key. If a staging secret leaks, production must be unaffected.
2. **Never paste a secret in chat, a commit, or a screenshot.** Type it straight into the Railway variable box. If one ever is exposed, rotate it.
3. **Stripe test mode only.** Staging uses `sk_test_…` / `pk_test_…`. Do not put a live key on staging, ever. Use card `4242 4242 4242 4242`.
4. **Staging database = a Neon branch, not a copy you share.** Do not point staging at the production connection string. Local laptops must not point at production either.
5. **Webhook secrets are mandatory.** The Easyship webhook fails closed without `EASYSHIP_WEBHOOK_SECRET`, and Stripe webhooks are only verified when `STRIPE_WEBHOOK_SECRET` is set. Use a different secret per environment.
6. **Keep search engines out:** `NEXT_PUBLIC_NOINDEX=true` on the staging storefront.
7. **Admin accounts:** staging admin gets a strong unique password (not the production one). Add your email to `SUPER_ADMIN_EMAILS`. Confirm `MEDUSA_FF_RBAC` is not `true`.
8. **Real emails on staging go to real inboxes.** Test with your own addresses only; staging customers' data must not be real people.
9. **Do not copy production customers/orders into the Neon branch.** Branch from main, then delete customers and orders on the branch (or branch from a schema-only snapshot) so no real personal data lives in staging.
10. **Production stays locked** (`ORDERS_OPEN` and `NEXT_PUBLIC_ORDERS_OPEN` unset) until the staging test passes.

## 1. Neon (database)
- Neon console → project → Branches → **Create branch** `staging` from `main`.
- Copy the **pooled** connection string (`DATABASE_URL`) and the **direct** one (`DATABASE_URL_DIRECT`) for that branch.
- On the branch, remove real customers/orders (rule 9), or create it as a schema-only branch if your plan allows.

## 2. Railway
- Project `friendly-elegance` → Environments → **New environment** `staging` (duplicate production), then for **both services** (backend, storefront): Settings → Source → branch **`staging`**.
- Backend variables, **new values, not production's**:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL`, `DATABASE_URL_DIRECT` | Neon staging branch |
| `JWT_SECRET`, `COOKIE_SECRET` | `openssl rand -base64 48` each |
| `STORE_CORS`, `AUTH_CORS` | `https://staging.mithrawholefoods.com` |
| `ADMIN_CORS` | `https://staging-api.mithrawholefoods.com` |
| `STOREFRONT_URL` | `https://staging.mithrawholefoods.com` |
| `BACKEND_PUBLIC_URL` | `https://staging-api.mithrawholefoods.com` |
| `REVALIDATE_SECRET` | `openssl rand -base64 32` (same on storefront) |
| `STRIPE_API_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from step 4 |
| `RESEND_API_KEY`, `RESEND_FROM` | step 5 |
| `ADMIN_NOTIFICATION_EMAIL` | your inbox |
| `EASYSHIP_API_KEY` | sandbox key (`sand_…`) |
| `EASYSHIP_WEBHOOK_SECRET` | long random string; same one goes into Easyship |
| `CLOUDINARY_*` | can reuse, or a separate folder/account |
| `ORDERS_OPEN` | `true` |
| `SUPER_ADMIN_EMAILS` | your email |

  Leave `REDIS_URL`, `TRACKING_DEMO_ENABLED`, `ALLOW_COD_COURIER` unset.
- Storefront variables: `MEDUSA_BACKEND_URL=https://staging-api.mithrawholefoods.com`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (new, step 3), `NEXT_PUBLIC_DEFAULT_REGION=us`, `NEXT_PUBLIC_BASE_URL=https://staging.mithrawholefoods.com`, `NEXT_PUBLIC_STRIPE_KEY=pk_test_…`, `NEXT_PUBLIC_ORDERS_OPEN=true`, `NEXT_PUBLIC_NOINDEX=true`, `REVALIDATE_SECRET`.
- Settings → Networking → **Custom domain**: `staging.mithrawholefoods.com` on the storefront, `staging-api.mithrawholefoods.com` on the backend. Railway shows the CNAME target for each.

## 3. DNS and first boot
- At your DNS provider add two **CNAME** records (`staging`, `staging-api`) pointing at the targets Railway shows. Wait for the certificate to turn green.
- Backend first deploy runs migrations automatically. Then, in a Railway shell for the **staging backend**: `npx medusa user -e you@example.com -p '<strong password>'`.
- Log in at `https://staging-api.mithrawholefoods.com/app`, Settings → **Publishable API keys** → create one for the default sales channel → paste into the storefront variable → redeploy the storefront.
- Region: staging database branched from production already has the USA/usd region and shipping options. Check Settings → Locations & Shipping has a fulfillment set with a shipping option; if you removed data, recreate it.

## 4. Stripe (test mode)
- Dashboard → toggle **Test mode** → Developers → API keys (`pk_test`, `sk_test`).
- Developers → Webhooks → **Add endpoint**: `https://staging-api.mithrawholefoods.com/hooks/payment/stripe_stripe`, events `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.amount_capturable_updated`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

## 5. Resend (email)
- resend.com → Domains → add `mithrawholefoods.com` (or a subdomain such as `mail.mithrawholefoods.com`, safer because it keeps production mail reputation separate). Add the SPF + DKIM records it shows to DNS. Wait for "Verified".
- API Keys → create a key with **sending access only**. `RESEND_FROM="Mithra Whole Foods <orders@mithrawholefoods.com>"` must use the verified domain.

## 6. Easyship (sandbox)
- Easyship dashboard → switch to the **sandbox** environment → Connect → API → create a sandbox key (`sand_…`).
- Webhooks → add `https://staging-api.mithrawholefoods.com/webhooks/easyship`, set the secret you chose as `EASYSHIP_WEBHOOK_SECRET`, subscribe to tracking status changes and label events.
- Check the ship-from address (Exton, PA) in the Easyship account.

## 7. Smoke test
1. Open `https://staging.mithrawholefoods.com` (banner should say orders are open, not "opening soon"), `/health` on both sites returns ok.
2. Run the test script in `docs/GO_LIVE_CHECKLIST_2026-10-24.md` section 5.
3. New this round to look for: Ship orders page offers **Courier** and **Manual**; manual flow sends "out for delivery" and "delivered" emails; cancel and refund from the admin order page send emails (these two rely on Medusa events, so confirm they arrive); `/track` shows the timeline.

## 8. When staging passes
Production changes, in order: live Stripe keys + live webhook, live Easyship key + webhook, Resend on production, rotate leaked credentials, one real $1–2 order, then set both `ORDERS_OPEN` flags.
