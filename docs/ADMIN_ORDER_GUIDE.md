# Order handling guide (for the store admin)

Written for non-technical staff. Everything happens in the store dashboard:

**https://mithra-wholefoods-production.up.railway.app/app**

Log in with your admin email and password. Bookmark the link.

---

## When a new order comes in

You'll receive an email titled with the order number. You don't need to
watch the dashboard — the email is your signal.

**Payment is already collected automatically** when the customer pays by
card. You never need to "capture" or approve payments.

## Shipping an order — 4 steps

1. Open the dashboard → **Orders** → click the new order.
   You'll see: what they bought, the shipping address they chose, and
   payment status **Captured** (= money received).
2. Pack the items in the box.
3. On the order page click **Fulfill items** → confirm the items → Fulfill.
4. When you hand the box to the courier, click **Mark as shipped** and paste
   the courier's **tracking number**. The customer automatically gets an
   email with the tracking link.

When the courier confirms delivery, open the order once more and click
**Mark as delivered**. Done.

## Common situations

**Customer wants to cancel (before you shipped)**
Open the order → ⋯ menu → **Cancel order**. The card payment is released
back to the customer automatically.

**Customer wants a refund (after shipping)**
Open the order → Payment section → **Refund** → enter the amount (full or
partial) → confirm. Money returns to the customer's card in 5–10 business
days.

**Something is out of stock**
Dashboard → **Inventory** → find the product → update the quantity.
When the quantity is 0, customers see "out of stock" and can't order it.

**Change a product's price or photo**
Dashboard → **Products** → click the product → edit → Save. The website
updates within a minute.

**Order says "Cash on Delivery"**
The customer chose to pay on delivery — no card was charged. Collect payment
when the courier delivers. (Ask your developer to turn this option off if
you only want card payments.)

## What NOT to touch

- **Settings** — region, shipping, and payment configuration lives here.
  Changes can break checkout; leave it to your developer.
- Anything you don't recognize — ask first, nothing is urgent enough to
  guess.

## Quick reference

| I want to… | Where |
|---|---|
| See new orders | Orders (newest on top) |
| Ship an order | Order page → Fulfill items → Mark as shipped |
| Refund | Order page → Payment → Refund |
| Update stock | Inventory |
| Change price/photo/description | Products |
| Edit homepage banners/text | Homepage (left sidebar) |
