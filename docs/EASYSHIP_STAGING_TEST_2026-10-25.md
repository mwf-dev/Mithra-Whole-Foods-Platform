# EasyShip staging test — 2026-10-25

Goal: prove the whole label → dispatch → carrier-sync loop on staging
**before** touching production (per `docs/GO_LIVE_CHECKLIST_2026-10-24.md` and
`docs/STAGING_SETUP.md` §6–8). Admin: `https://staging-api.mithrawholefoods.com/app`.

## Prereqs (already/dear from STAGING_SETUP.md)

- `EASYSHIP_API_KEY` = sandbox key (`sand_…`), `EASYSHIP_WEBHOOK_SECRET` set on
  both the backend and the Easyship dashboard webhook
  `https://staging-api…/webhooks/easyship` (tracking + label events subscribed).
- Stripe test key, `ORDERS_OPEN=true`, Resend configured.

## A. Ship-side loop (our admin)

1. Guest checkout a real test order (card `4242 4242 4242 4242`); confirmation
   email arrives **with a "Download invoice (PDF)" button that opens without
   any login** (the new signed link).
2. Admin → **Ship orders** → the order shows "Paid".
3. Choose **Courier partner → Buy label & pack**. Expect:
   - toast "Label bought"; stage moves to **Label ready**;
   - **Print label** button opens the courier PDF (print a 4×6 test page);
   - packing slip prints;
   - Ship orders card shows a tracking number;
   - customer "shipped"-stage email arrives only after you mark shipped.
4. **Mark as shipped** → stage **Shipped**, customer email with tracking link.
5. COD check (C8): place a second order paying with **Cash on Delivery**
   (`pp_system_default`). On Ship orders, "Pay on delivery" badge shows;
   choosing **Courier partner** must be **refused** with
   "…can only go by manual delivery…"; choosing **We deliver** works, then
   "Out for delivery" → "Mark delivered" — each state emails the customer.

## B. Carrier-side loop (Easyship dashboard → our dashboard) ← the part you asked about

Do this from the **Easyship sandbox dashboard** on the shipment bought in A.3:

1. Open Ship orders → the order card; note the current timeline
   ("Label created").
2. In Easyship: use the sandbox shipment controls (or their test webhook
   simulator) to move the shipment through
   `in_transit → out_for_delivery → delivered`.
3. After **each** step, click **Check courier status now** on the order card
   AND wait ~1 min for the push webhook. Expect:
   - the timeline on the order card gains the matching entry with a timestamp
     ("In transit", "Out for delivery", "Delivered");
   - `/track?order=<number>` on the storefront shows the same timeline;
   - the account order page shows the same for a logged-in buyer;
   - the **Delivered** status appears on the Ship orders "Delivered" tab and
     the delivered customer email arrives — exactly once.
4. **Duplicate delivery event**: re-send/trigger "delivered" a second time.
   Expect: no second delivery email, no duplicate timeline entry — the route
   logs "already delivered; duplicate event ignored".
5. **Ops log** (super-admin): Admin → **Ops log** → filter Kind=Webhook. Every
   event from B.2–B.4 should be listed OK, with the tracking number; delivered
   rows link to the order.
6. **Failure & retry (the reason C5 exists)**: in Easyship, request a
   delivery event for a tracking number that does not match any order
   (or temporarily set a wrong webhook secret, trigger an event, fix it
   back). Expect a **Failed** row in Ops log with the reason; click
   **Retry** after fixing and watch it turn OK.

## C. Security spot-checks

- `curl -X POST https://staging-api…/webhooks/easyship -d '{}'`
  without a signature → **401** (never updates anything).
- Wrong-signature request → **401**, and a Failed row appears in Ops log.
- `GET /invoice/<order-id>` **without** `?t=` → **401**; with the emailed
  link → PDF streams.

## Pass criteria / when to promote

All of A, B, C pass end-to-end → merge `staging` to `deployed-main`, swap live
Stripe + live Easyship keys and webhooks, one real low-value order, then flip
`ORDERS_OPEN` / `NEXT_PUBLIC_ORDERS_OPEN` (see GO_LIVE_CHECKLIST §6).

## Known follow-ups (not blockers for staging)

- Easyship request payloads still carry placeholder box size (10×10×10 cm),
  0.5 kg default weight and HS code 17049000 — set real per-product weights in
  the catalog before going live.
- Stripe webhook events are not in the ops log yet (Medusa built-in route);
  the Easyship webhook, all emails and label events are.
