# Launch Checklist — Mithra Whole Foods

**Date:** 2026-08-02
**Purpose:** everything between here and real customers with real money, in
priority order. Each item says *why* and *how you'll know it's done*.
**Companion docs:** [`OBSERVABILITY_SETUP.md`](./OBSERVABILITY_SETUP.md) (exact
env vars) · [`AUDIT_2026-08-01_FRONTEND_PERF.md`](./AUDIT_2026-08-01_FRONTEND_PERF.md)
(why the site feels slow) · [`SHIPPING_AUTOMATION_RESEARCH.md`](./SHIPPING_AUTOMATION_RESEARCH.md)
(shipping phasing) · [`DEPLOYMENT.md`](../DEPLOYMENT.md) (Railway/Vercel mechanics)

Legend: 🔴 **P0 — blocks launch.** 🟠 **P1 — do in week 1.** 🟡 **P2 — do in
month 1.** ⚪ **P3 — backlog.**

---

## P0 — Blocks launch

Nothing here is optional. Each one is either a security exposure, a silent
revenue leak, or a legal requirement once real customer data flows.

### Credentials
- [ ] 🔴 **Rotate every secret ever committed to git**, not just the ones
      currently in `.env`. `get_key.js`, `test-db.js`, `test-env.js`, and real
      `.env.*` files were tracked historically and remain recoverable from git
      history even though they were removed (`e8251b4`). **Removal ≠
      rotation.** Rotate: Neon `DATABASE_URL`, Cloudinary API secret, Stripe
      keys, `JWT_SECRET`, `COOKIE_SECRET`. Assume anyone who cloned the repo
      before that commit has the old values.
- [ ] 🔴 Generate fresh `JWT_SECRET` / `COOKIE_SECRET` (`openssl rand -base64
      48`) — the config throws at boot if these are unset or `supersecret`
      outside dev, so this is enforced, but confirm the values in Railway are
      actually the rotated ones, not leftover dev defaults.
- [ ] 🔴 Confirm `DATABASE_URL` in production is the **pooled** Neon
      connection string, and `DATABASE_URL_DIRECT` is the **direct** one (used
      only for migrations — PgBouncer breaks DDL locks).
- [ ] 🔴 `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` list your real production
      Vercel domain(s), not `localhost`. Missing/wrong CORS is fatal at boot in
      production by design — if the backend boots, this is at least *set*, but
      verify it's set to the *right* domain.

### Payments
- [ ] 🔴 **Set `STRIPE_WEBHOOK_SECRET`.** Confirmed live at every backend boot
      today: *"Option `webhookSecret` is missing in Stripe plugin. Webhook
      signature verification will fail…"* Without it, async payment
      confirmation (3D Secure, delayed capture, disputes) cannot be trusted.
      Card payments work today; this is what makes them **provably** correct.
- [ ] 🔴 Confirm you're on **live** Stripe keys (`sk_live_...`,
      `pk_live_...`), not test keys, before the first real order. Whether a
      key is live/test is decided purely by prefix — a leftover `sk_test_`
      would take real customers' money into a sandbox.
- [ ] 🔴 Place one real test order end-to-end with a real card (or Stripe
      test-mode card if you're staging this first) and confirm: order lands in
      admin, payment shows captured, confirmation page renders.

### Legal / compliance
- [ ] 🔴 **Privacy policy live and linked**, before turning on any analytics
      key. Once `NEXT_PUBLIC_POSTHOG_KEY` is set, the site collects session
      replay and behavioral data; once `NEXT_PUBLIC_SENTRY_DSN` is set, it
      collects error context. Both are configured to mask text/inputs and
      never send PII (see `OBSERVABILITY_SETUP.md` §2), but you still need a
      policy disclosing that collection happens.
- [ ] 🔴 Terms of service / return policy visible somewhere in the footer —
      standard for a store taking payment.
- [ ] 🔴 Decide your cookie-consent posture. The app sets functional cookies
      (`_medusa_cart_id`, `_medusa_jwt`, `_medusa_cache_id`) unconditionally
      today — that's normally fine under "strictly necessary," but PostHog's
      persistence cookie is not. If you're only selling in the US this may not
      be legally required, but decide it deliberately rather than by default.

### Fulfillment reality check
- [ ] 🔴 **Every shipping option is `manual_manual`** — confirmed live
      2026-08-01. There is no pickup option even though checkout renders a
      pickup UI branch (it's currently dead code). Before launch, someone on
      your team needs to know that **every single order requires a human to
      manually arrange shipping** — this isn't a bug to fix before launch, it's
      an operational fact to be ready for. If you don't have a person ready to
      do that daily, don't launch until Phase 1 of the shipping plan lands
      (see P1 below).

---

## P1 — Week 1

The highest-leverage items. Most cost nothing but your time to add a key.

### Full visibility (your "not a black box" ask)

This is the complete list of what you'll be able to see once each piece is
turned on — the point is that after this section, every part of the
application reports somewhere you can look.

- [ ] 🟠 **Set `STOREFRONT_PROXY_SECRET`** (same value on both apps —
      `openssl rand -hex 32`). Free, zero vendor. Fixes the rate limiter: right
      now the storefront is server-rendered, so **every shopper shares one IP**
      and the `/store/*` limit (150 req/min) is a site-wide ceiling, not a
      per-customer one. A few people browsing normally can lock everyone out.
      This is probably your single highest-value five minutes.
- [ ] 🟠 **Set `NEXT_PUBLIC_POSTHOG_KEY` / `POSTHOG_KEY`.** Turns on:
  - The full funnel: `product_viewed → cart_item_added → checkout_started →
    order_completed`, with drop-off at every step.
  - `search_no_results` — every query that found nothing. This is the
    single best "what should I stock / what should I rename" signal you can
    get, and today you're flying blind on it.
  - `cart_mutation_failed` — an add-to-cart the backend rejected. Right now
    that's a toast that vanishes; with this on, you'll see exactly how often
    it happens and why (usually the rate limit above).
  - Session replay on error, so you can *watch* a failed checkout instead of
    guessing.
- [ ] 🟠 **Set `NEXT_PUBLIC_SENTRY_DSN` (web) and `SENTRY_DSN` (backend)** —
      can be the same Sentry project. Turns on:
  - Every caught error that used to vanish into a `console.error` or an
    empty fallback (six data-loading helpers used to fail *silently* — they
    now report first).
  - The checkout error boundary specifically — the highest-severity alert
    in the app, because anything that lands there already cost you a sale.
  - Payment-session failures, tagged separately.
- [ ] 🟠 **Configure two alerts** once Sentry is live (5 minutes in the Sentry
      UI):
  1. Tag `rate_limited:true` appears → your shared request budget is
     exhausted (fixed by the item above, but you want to know if it happens
     again as you scale).
  2. Scope `boundary.checkout` fires → page immediately, this is a lost sale
     in progress.
- [ ] 🟠 **Point an uptime monitor at `GET /health`** on the storefront (not
      `/`) and Railway's existing `GET /health` on the backend. The storefront
      probe is a *deep* check — it verifies the backend is actually reachable
      and returning regions, not just that Next.js is up. A shallow check would
      stay green during the exact outage this app is prone to.
- [ ] 🟠 **Build one PostHog dashboard**: the funnel above, plus
      `search_no_results` as a table, plus `cart_mutation_failed` count over
      time. That's the whole "am I losing sales, and where" picture in one
      screen.

### Unblock what's already built, no code
- [ ] 🟠 Set `SENDGRID_API_KEY` + `SENDGRID_FROM_EMAIL` +
      `SENDGRID_ORDER_PLACED_TEMPLATE_ID` + `SENDGRID_ORDER_SHIPPED_TEMPLATE_ID`
      + `ADMIN_NOTIFICATION_EMAIL`. The order-confirmation and shipment-tracking
      emails are fully written and are silently no-op'ing today — this is not a
      code task, it's four env vars and two SendGrid templates.
- [ ] 🟠 Confirm you (or whoever runs the shop) get the **admin new-order
      email** — test by placing an order and checking the inbox in
      `ADMIN_NOTIFICATION_EMAIL`. This is your only "someone ordered"
      notification until you're checking the PostHog dashboard daily.

### Shipping — minimum to not embarrass yourself
- [ ] 🟠 Rename the fulfillment set from **"European Warehouse delivery"**
      (a Medusa starter leftover) — it's what your own staff see in admin.
- [ ] 🟠 Decide: what's your Exton-area local delivery ZIP radius, and what's
      your free-shipping threshold? Both are pure business decisions blocking
      nothing technical — `FreeShippingPriceNudge` is already wired into the
      UI, waiting for the number.
- [ ] 🟠 If local delivery is a differentiator vs. the old OpenCart site
      (it was — free home delivery in Exton), get it modeled as a real
      Medusa shipping zone before launch, not "we'll figure it out." See
      Phase 1 in `SHIPPING_AUTOMATION_RESEARCH.md` — it's config, not code.

### Performance — the one that actually matters
- [ ] 🟠 **Trace and fix `/store/products` with `calculated_price`.**
      Measured 2026-08-02: **4.7–10.9 seconds**, versus ~220ms for one raw
      query against the same database. This single call is larger than every
      other performance issue in the audit combined — likely a per-variant N+1
      in price resolution. Nothing else on the perf list is worth doing until
      this lands; every other fix saves tens to hundreds of ms, this one saves
      seconds.

---

## P2 — Month 1

Real, but the store works and is watched without these.

- [ ] 🟡 Ship the rest of the perf audit P0 (`docs/AUDIT_2026-08-01_FRONTEND_PERF.md`
      §10): remove the unconditional `router.refresh()` after cart mutations,
      add `staleTimes` to `next.config.js`, Suspense-split the `(main)` layout,
      remove the PDP's mount-time `router.replace`. Each is tens–hundreds of ms;
      do them together, they interact.
- [ ] 🟡 Fix pagination past product 100 (`listProductsWithSort` fetches 100
      products and paginates that window — currently masked by a ~54-product
      catalog, will silently return empty pages once you cross 100 SKUs).
- [ ] 🟡 Reconcile the two greens / three creams / two button systems in the
      UI (`docs/PRODUCTION_ROADMAP.md` §3) — mechanical, and it's likely most
      of what reads as "the UI needs to be better." **Do this after**, not
      before, the P1 perf item — a nicer-looking slow site reads as "still
      slow, and now different."
- [ ] 🟡 Backfill product weight/dimensions if you're planning Phase 2
      shipping automation (EasyPost) — live rating is impossible without them
      and nothing in the catalog currently has them populated.
- [ ] 🟡 Decide the EasyPost vs. Shippo vs. ShipEngine question with real
      12-month volume numbers once you have a few weeks of order data —
      `SHIPPING_AUTOMATION_RESEARCH.md` §3 has the comparison, but the free-tier
      math depends on your actual volume.

---

## P3 — Backlog

- [ ] ⚪ Extend the Vitest suite beyond the retry logic — currently unit-only,
      no component/integration tests for `apps/web`.
      (`apps/web/vitest.config.mts`, `pnpm --filter medusa-next test`.)
- [ ] ⚪ Uber Direct for on-demand local delivery — volume-gated, see
      Phase 3 of the shipping research.
- [ ] ⚪ Static shell / PPR for the catalog once the layout is Suspense-split.
- [ ] ⚪ Replace the in-process, per-instance search index if you scale to
      multiple Railway instances — currently each instance can disagree about
      results until it independently rebuilds.

---

## The one-screen version

If you do nothing else before letting customers in:

1. Rotate secrets (🔴 credentials).
2. `STRIPE_WEBHOOK_SECRET` (🔴 payments).
3. Privacy policy up (🔴 legal — required *before* you flip analytics on).
4. `STOREFRONT_PROXY_SECRET` + PostHog + Sentry keys (🟠 visibility — this is
   what turns the app from a black box into something you can watch).
5. `SENDGRID_API_KEY` + templates (🟠 you need to know when someone orders).
6. Fix the products-query N+1 (🟠 the single biggest lever on "the site is
   slow").

Everything else is real work, but the store can survive without it for a
week or a month. These six can't.
