# Shipping & Delivery Automation — Research and Recommendation

**Date:** 2026-08-01
**Goal:** get from today's fully-manual fulfillment to automated rating, label
purchase, tracking and customer notification — covering both **local delivery
around Exton, PA** and **national parcel shipping**, without a rewrite between
the two phases.
**Status:** research only. Nothing implemented.

---

## 1. Ground truth — what is live right now

Taken from a read-only run of `apps/backend/src/scripts/diagnose-fulfillment.ts`
against the production Neon database on 2026-08-01:

```
=== REGIONS ===
- USA [usd] countries: us

=== STOCK LOCATIONS ===
- Mithra Whole Foods — Exton @ Exton, us

=== FULFILLMENT SETS / SERVICE ZONES ===
- European Warehouse delivery (shipping)
    zone "USA" -> country:us

=== SHIPPING OPTIONS ===
- Standard Shipping [provider: manual_manual] zone: USA (us)
- Express Shipping [provider: manual_manual] zone: USA (us)
```

What this means:

- **No fulfillment provider is integrated.** Both options use
  `manual_manual` — Medusa's built-in no-op provider. It buys no labels,
  quotes no rates, returns no tracking.
- **`medusa-config.ts` does not register `@medusajs/medusa/fulfillment` at
  all.** Medusa falls back to the default manual provider. Confirmed by reading
  the `modules` array — homepage, product-review, file, redis, payment and
  notification are conditionally pushed; fulfillment never is.
- **The fulfillment set is still named "European Warehouse delivery"** — an
  untouched leftover from the Medusa default starter. Cosmetic, but it's the
  name staff see in admin.
- **Geo zoning is country-level only** (`country:us`). There is no distinction
  between "20 minutes from the Exton store" and "California". Local delivery and
  national shipping are currently the same zone, at the same flat rates.
- **No `pickup`-type fulfillment set exists**, even though the checkout UI has a
  full pickup branch (`apps/web/src/modules/checkout/components/shipping/index.tsx:86-91`).
  That code is unreachable in production.
- Rates are **flat** (`price_type` is not `calculated`), so shipping cost is
  unrelated to weight, dimensions, distance or carrier.

**Consequence:** every order today requires a human to decide how it ships, buy
postage outside the system, and paste a tracking number into admin. The
`shipment-created` subscriber that would email tracking exists
(`apps/backend/src/subscribers/shipment-created.ts`) but no-ops because
`SENDGRID_API_KEY` is unset.

---

## 2. What Medusa v2 requires of an integration

A fulfillment integration is a **module provider** extending
`AbstractFulfillmentProviderService`. Required methods:

| Method | Purpose |
|---|---|
| `getFulfillmentOptions()` | Advertise what this provider can ship (carrier × service level). Feeds the options staff pick from in admin. |
| `validateOption()` | Validate a shipping option's `data` shape. |
| `validateFulfillmentData()` | Validate + transform the data stored on the shipping method at checkout. Common place to create a draft shipment upstream and stash its id. |
| `canCalculate()` | Whether this option supports dynamic pricing. |
| `calculatePrice()` | Live rate quote. Returns `{ calculated_amount, is_calculated_price_tax_inclusive }`. **Called on every cart refresh during checkout** — latency and rate limits matter here. |
| `createFulfillment()` | Buy the label / dispatch the courier. Returns external ids + tracking. |
| `cancelFulfillment()` | Void label / cancel delivery. |
| `createReturnFulfillment()` | Return labels. |

Optional: `getFulfillmentDocuments()`, `getShipmentDocuments()`,
`getReturnDocuments()`, `retrieveDocuments()` — for pulling the label PDF.

Registration:

```ts
// medusa-config.ts
{
  resolve: "@medusajs/medusa/fulfillment",
  options: {
    providers: [
      { resolve: "./src/modules/<name>", id: "<name>", options: { apiKey: … } },
    ],
  },
}
```

**Important:** registering the fulfillment module explicitly means you must
also keep `manual` in the provider list if you want to retain the existing
manual options — same pattern already used for Stripe + `pp_system_default` in
`medusa-config.ts`.

**Two things to design around:**

1. `calculatePrice()` is on the checkout hot path. A slow or rate-limited
   carrier API becomes checkout latency. Cache quotes per (cart hash, option)
   with a short TTL — Redis is already registered in production.
2. The Medusa v2 ecosystem has **no official, maintained Shippo or EasyPost
   plugin**. `macder/medusa-fulfillment-shippo` is Medusa **v1**. The only
   first-party material is a *build-it-yourself guide* for ShipStation. Budget
   for writing and owning the provider module.

---

## 3. National parcel — provider comparison

| | **EasyPost** | **Shippo** | **ShipEngine / ShipStation API** |
|---|---|---|---|
| Model | Developer-first multi-carrier API | SMB platform + API | Developer API from Auctane (ShipStation) |
| Carriers | ~100+, broadest | Major US + intl | Broad |
| Price | ~$0.08/label; 3,000 free labels/mo on Free Access; $20/mo + $0.08 on BYOCA | ~$0.05/label pay-as-you-go; $19–$199/mo Pro | Tiered ~$75–$600/mo |
| Own carrier accounts | Yes (BYOCA) | Yes | Yes |
| Address validation | Built into API | Yes | Yes |
| Medusa fit | No plugin — build the provider | No v2 plugin — build the provider | **Official Medusa build-guide exists** |
| Best when | Volume is low, or you need many carriers | You also want a staff-facing dashboard | You want the documented path + a warehouse UI |

**Recommendation for this business: start with EasyPost.**

Reasoning specific to Mithra:
- Order volume is currently single digits (8 recent orders in the DB). **3,000
  free labels/month covers the foreseeable future at $0.** ShipEngine's $75/mo
  floor is real money for a shop at this stage; Shippo's per-label price is
  lower but has no free tier.
- Address validation is in-API, which pairs with the existing keyless
  Photon/Zippopotam autocomplete at checkout — you get a second, authoritative
  validation before buying a label.
- The "no Medusa plugin" downside is equal across all three: you are writing a
  provider module either way. ShipEngine's advantage is a written guide, which
  is worth something but not $900/year.

**Caveat to check before committing:** confirm EasyPost's current Free Access
terms directly — pricing pages change, and the figures above come from
comparison articles, not from EasyPost's own pricing page. Verify before
building.

**Food-specific:** this catalog is shelf-stable (oils, rice, flours, spices,
pickles, sweets). No cold-chain requirement, so standard USPS Ground
Advantage / UPS Ground is fine. Weight matters a lot though — rice and oil are
dense, and flat-rate shipping on a 10 lb order loses money. This is the
strongest argument for moving off flat rates to `calculated`.

---

## 4. Local delivery around Exton, PA

The existing OpenCart site offers **local pickup + free home delivery** in the
Exton area. That's a differentiator and should survive the migration. Three
architectures:

### Option A — Own fleet, zone-priced (no integration)
Model it purely in Medusa: a second fulfillment set with a **postal-code geo
zone** covering the delivery radius, a `$0` shipping option gated on that zone,
plus a `pickup`-type set for in-store collection.

- Cost: $0. No third party.
- Automation ceiling: order lands with the right method and zone; a human still
  drives. Add a delivery-day picker and route printing later.
- **This is the correct Phase 1 regardless of what else you do.** It fixes the
  fact that today, someone in California and someone in Exton see the same two
  flat options.

### Option B — On-demand courier (Uber Direct / DoorDash Drive)
Dispatch a third-party courier per order via API.

- **Uber Direct** — quote → create delivery → tracking, with webhooks for
  delivery status, courier updates, refunds. Sandbox available. Fixed per-delivery
  fee by distance/speed/region, 0% commission, advertised from ~$6.99.
- **DoorDash Drive** — white-label fleet, no marketplace listing required.
  Commission-based; third-party delivery economics commonly land 15–30%+, which
  is poor for grocery basket sizes.

Fits Medusa cleanly: `calculatePrice()` → courier quote, `createFulfillment()`
→ create delivery, webhook → update fulfillment status. Uber Direct is the
better economic fit of the two for a grocery AOV.

### Option C — Route optimisation for own fleet (Onfleet, Circuit, Routific)
Batch same-day/next-day orders into an optimised driver route. Right answer at
maybe 15+ local deliveries/day; premature below that.

**Recommendation:** Option A now. Option B as an opt-in "deliver today" upsell
once local volume justifies it. Option C only if you hire drivers.

---

## 5. Recommended phased architecture

Designed so each phase is additive — no rework between them.

### Phase 0 — Unblock what already exists (days, no new vendor)
The automation you've already built is switched off:

1. Set **`SENDGRID_API_KEY`** + `SENDGRID_ORDER_PLACED_TEMPLATE_ID` +
   `SENDGRID_ORDER_SHIPPED_TEMPLATE_ID` + `ADMIN_NOTIFICATION_EMAIL`.
   Order-confirmation and tracking emails start working with zero code —
   `order-placed.ts` and `shipment-created.ts` are written and waiting.
2. Set **`STRIPE_WEBHOOK_SECRET`**. Confirmed live warning on backend boot:
   *"Option `webhookSecret` is missing in Stripe plugin. Webhook signature
   verification will fail…"* Until set, async payment confirmation can't be
   trusted.
3. Rename the `European Warehouse delivery` fulfillment set.

*Phase 0 is the highest value-per-hour work in this entire document.*

### Phase 1 — Model the real shipping picture (1–2 weeks, still $0)
4. Create a `pickup` fulfillment set → the dead checkout pickup branch comes
   alive.
5. Create a **postal-code geo zone** for the Exton delivery radius; attach a
   free/low-cost "Local Home Delivery" option to it.
6. Re-zone the national options so they don't apply inside the local radius.
7. Replace flat rates with weight banding, or accept flat rates knowingly with
   a documented margin assumption.

Outcome: correct options per shopper, pickup restored, parity with the
OpenCart site. Still manual label buying — but now the *data* is right, which
is the precondition for Phase 2.

### Phase 2 — Automate national parcel (2–4 weeks)
8. Build `apps/backend/src/modules/easypost/` implementing
   `AbstractFulfillmentProviderService`.
9. `calculatePrice()` → live rates, cached in Redis per cart+option, short TTL.
10. `createFulfillment()` → buy label, return tracking; label PDF via
    `getShipmentDocuments()`.
11. Carrier tracking webhook → Medusa fulfillment status → existing
    `shipment-created` subscriber emails the customer. **This is the point at
    which shipping becomes genuinely automatic.**
12. Register `@medusajs/medusa/fulfillment` with **both** the new provider and
    `manual`, so local delivery/pickup keep working.

**Prerequisite:** products need real `weight`/`length`/`width`/`height`. Live
rating is impossible without them, and the catalog currently has no evidence of
populated dimensions. Audit and backfill this during Phase 1.

### Phase 3 — On-demand local courier (optional, volume-gated)
13. Uber Direct provider module, offered as a "Delivered today" option inside
    the local geo zone only, alongside the free standard local delivery.

---

## 6. Open questions for the business

These change the recommendation and I can't answer them from the code:

1. **Delivery radius** — which ZIPs count as "local"? Needed for the Phase 1
   geo zone.
2. **Who packs and ships today?** If a person is already at a ShipStation-style
   UI daily, ShipEngine's price buys a workflow, not just an API.
3. **Expected volume in 12 months?** Under ~3,000 parcels/month, EasyPost is
   free and the decision is easy.
4. **Do you have negotiated USPS/UPS rates?** All three aggregators support
   BYOCA; if you don't, their pooled rates are usually better than retail.
5. **Free-shipping threshold?** `FreeShippingPriceNudge` is already wired into
   the layout, so the UI exists — the rule needs defining.

---

## 7. Sources

- [How to Create a Fulfillment Module Provider — Medusa](https://docs.medusajs.com/resources/references/fulfillment/provider)
- [Integrate Medusa with ShipStation (Fulfillment) — Medusa](https://docs.medusajs.com/resources/integrations/guides/shipstation)
- [Shipping API Comparison 2026: EasyPost vs Shippo vs ShipEngine — RevAddress](https://revaddress.com/blog/shipping-api-comparison-2026/)
- [ShipStation vs ShipEngine vs EasyPost for Headless Commerce Fulfillment (2026) — Contra Collective](https://contracollective.com/blog/shipstation-vs-shipengine-vs-easypost-headless-commerce-fulfillment-2026)
- [Shippo vs EasyPost in 2026 — Ecommerce Paradise](https://ecommerceparadise.com/shippo-vs-easypost-2026/)
- [Uber Direct APIs — Uber Developers](https://developer.uber.com/docs/deliveries/overview)
- [Get Uber Direct — Uber Eats Merchants](https://merchants.ubereats.com/us/en/services/uber-direct/)
- [Third-Party Delivery Fees in 2026 — Rezku](https://rezku.com/blog/third-party-delivery-fees-in-2026-what-doordash-uber-eats-grubhub-really-cost-restaurants/)
- [macder/medusa-fulfillment-shippo (Medusa v1 only)](https://github.com/macder/medusa-fulfillment-shippo)

*Vendor pricing is quoted from comparison sources dated 2026 and must be
re-verified against each vendor's own pricing page before any commitment.*
