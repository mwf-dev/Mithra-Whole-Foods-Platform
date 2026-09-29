# Stripe payments — setup & testing guide

Everything needed to run the full order cycle (browse → cart → checkout →
payment → fulfillment → delivery emails) in **Stripe test mode** (sandbox),
and later flip to live. The code side is already done on this branch:

- Backend: Stripe provider registered in `medusa-config.ts` when
  `STRIPE_API_KEY` is set, with **auto-capture** (admin never captures manually).
- Backend: order emails — `src/subscribers/order-placed.ts` (customer
  confirmation + admin alert) and `src/subscribers/shipment-created.ts`
  (tracking email).
- Storefront: already ships Stripe checkout UI; it activates when
  `NEXT_PUBLIC_STRIPE_KEY` is set. COD (`pp_system_default`) remains available
  unless you disable it per region in the admin.

The non-technical day-to-day guide for the client is `docs/ADMIN_ORDER_GUIDE.md`.

---

## Part 1 — Stripe account & API keys (~10 min)

1. Create an account at https://dashboard.stripe.com/register (no bank
   details needed for test mode).
2. Make sure the dashboard is in **Test mode** (toggle, top right).
3. Go to **Developers → API keys** and copy:
   - **Publishable key** `pk_test_...` → goes to the storefront (Vercel)
   - **Secret key** `sk_test_...` → goes to the backend (Railway)

## Part 2 — Webhook (~5 min)

Lets Stripe report payment results back to Medusa (required for 3D Secure
and async flows; recommended always).

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL:
   `https://mithra-wholefoods-production.up.railway.app/hooks/payment/stripe_stripe`
3. Events to send:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.partially_funded`
4. After creating, copy the **Signing secret** `whsec_...`.

## Part 3 — Environment variables

**Railway (backend):**

| Variable | Value |
|---|---|
| `STRIPE_API_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

**Vercel (storefront), Production + Preview:**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_STRIPE_KEY` | `pk_test_...` |

Redeploy both after setting.

## Part 4 — Admin panel configuration (one-time, ~15 min)

At `https://mithra-wholefoods-production.up.railway.app/app`:

1. **Enable Stripe on the region**: Settings → Regions → United States →
   ⋯ Edit → Payment providers → tick **Stripe (stripe)** → Save.
   (Optionally untick *System default* if the client doesn't want COD.)
2. **Stock location** (required for shipping): Settings → Locations & Shipping
   → Create location — name "Main warehouse", the client's US address.
3. **Sales channel link**: on the location page → Sales channels → connect
   the default sales channel.
4. **Fulfillment provider**: on the location page → Fulfillment providers →
   connect *Manual fulfillment*.
5. **Shipping**: on the location page → Fulfillment sets → create a
   **Shipping** fulfillment set → add a **service zone** covering
   United States → add shipping options, e.g.:
   - "Standard shipping" — flat $5.99
   - "Free shipping" — $0, rule: cart total ≥ $49
6. **Inventory**: Inventory → set quantities at "Main warehouse" (or per
   product variant → Inventory). Products with *manage inventory* on and no
   stock show as out of stock.
7. **Unpriced products**: fix or unpublish *Wood Pressed Groundnut Oil*,
   *Organic Turmeric Powder*, and delete the *Test* product.

## Part 5 — Order emails via SendGrid (optional but recommended, ~30 min)

Without this, orders still work — customers just get no emails and the admin
gets no alert (they'd check the dashboard instead).

1. SendGrid account → **Settings → API Keys** → create key with Mail Send
   permission.
2. **Settings → Sender Authentication** → verify a sender (the client's
   email/domain).
3. **Email API → Dynamic Templates** → create two templates and note their
   `d-...` ids:

**Template "Order confirmation"** (also reused for the admin alert) — data
available: `order_id`, `order_date`, `email`, `subtotal`, `shipping_total`,
`total`, `shipping_address`, `items[]` (`title`, `quantity`, `total`):

```html
<h2>Thank you for your order {{order_id}}</h2>
<p>Placed on {{order_date}}.</p>
<table width="100%" cellpadding="6" style="border-collapse:collapse">
  {{#each items}}
  <tr style="border-bottom:1px solid #eee">
    <td>{{this.title}}</td><td>× {{this.quantity}}</td>
    <td align="right">{{this.total}}</td>
  </tr>
  {{/each}}
  <tr><td colspan="2">Subtotal</td><td align="right">{{subtotal}}</td></tr>
  <tr><td colspan="2">Shipping</td><td align="right">{{shipping_total}}</td></tr>
  <tr><td colspan="2"><strong>Total</strong></td>
      <td align="right"><strong>{{total}}</strong></td></tr>
</table>
<p>Shipping to: {{shipping_address}}</p>
```

**Template "Order shipped"** — data: `order_id`, `tracking[]` (`number`, `url`):

```html
<h2>Your order {{order_id}} is on its way</h2>
{{#each tracking}}
<p>Tracking number: <a href="{{this.url}}">{{this.number}}</a></p>
{{/each}}
```

4. Railway variables:

| Variable | Value |
|---|---|
| `SENDGRID_API_KEY` | `SG....` |
| `SENDGRID_FROM_EMAIL` | the verified sender |
| `SENDGRID_ORDER_PLACED_TEMPLATE_ID` | `d-...` |
| `SENDGRID_ORDER_SHIPPED_TEMPLATE_ID` | `d-...` |
| `ADMIN_NOTIFICATION_EMAIL` | client's inbox for new-order alerts |

## Part 6 — Test the full cycle

Stripe test cards (any future expiry, any CVC, any ZIP):

| Card | Behavior |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3D Secure confirmation |
| `4000 0000 0000 9995` | Declined (insufficient funds) |

**Customer side** — on the storefront: add a product to cart → checkout →
US address → pick a shipping option → payment shows **Credit card** →
enter `4242...` → Place order → confirmation page. Check the confirmation
email arrived (if Part 5 done).

**Verify in Stripe** — Dashboard (test mode) → Payments: the charge appears as
**Succeeded**, amount matches the order total.

**Admin side** — `/app` → Orders: the order is there; Payment status
**Captured** (auto-capture); follow `docs/ADMIN_ORDER_GUIDE.md` to fulfill it
with a fake tracking number and confirm the shipped email.

**Also test** the 3DS card (a confirmation modal appears — webhook must be
configured for the order to complete) and the declined card (checkout shows
an error, no order is created).

## Going live (later)

1. Activate the Stripe account (business + bank details) in the dashboard.
2. Repeat Part 1–3 with **live mode** keys (`pk_live_`/`sk_live_`) and a new
   live-mode webhook endpoint + its signing secret.
3. Nothing else changes — same code, same admin flow.

## Troubleshooting

- **"Credit card" doesn't appear at checkout** → Stripe not enabled on the
  region (Part 4.1), or `NEXT_PUBLIC_STRIPE_KEY` missing on Vercel, or
  backend deployed without `STRIPE_API_KEY`.
- **No shipping options at checkout** → Part 4.2–4.5 incomplete (location /
  service zone / options / sales-channel link).
- **3DS orders stuck pending** → webhook missing or wrong
  `STRIPE_WEBHOOK_SECRET`; check Stripe → Webhooks → endpoint deliveries.
- **No emails** → check Railway logs for `[order-placed]` warnings (they say
  exactly which env var is missing).
