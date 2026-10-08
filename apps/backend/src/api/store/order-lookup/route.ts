import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { samePhone } from "../../../lib/phone"

/**
 * POST /store/order-lookup  { order: "ORD-ABC123" | "15", phone: "610-202-3456" }
 *
 * Guest order tracking. The order number alone is never enough: the phone
 * number on the shipping address must also match, so a guessed number reveals
 * nothing. Every failure returns the same 404 so the response can't be used to
 * discover which order numbers exist. Rate limited in src/api/middlewares.ts
 * (per IP and per order number).
 *
 * Returns only what tracking needs — no full address, no email, no payment.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const { order: rawOrder, phone } = (req.body ?? {}) as { order?: string; phone?: string }
  const input = String(rawOrder ?? "").trim().replace(/^#/, "")
  const notFound = () =>
    res.status(404).json({ message: "We couldn't find an order matching those details." })

  if (!input || !phone || input.length > 40) return notFound()

  const orders = req.scope.resolve(Modules.ORDER)
  const filter = /^\d+$/.test(input)
    ? { display_id: Number(input) }
    : { metadata: { order_number: input.toUpperCase() } }
  const [found] = await orders.listOrders(filter as any, { select: ["id"], take: 1 })
  if (!found) return notFound()

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "metadata",
      "created_at",
      "canceled_at",
      "shipping_address.phone",
      "shipping_address.city",
      "shipping_address.province",
      "items.title",
      "items.product_title",
      "items.quantity",
      "fulfillments.id",
      "fulfillments.packed_at",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "fulfillments.labels.tracking_number",
      "fulfillments.labels.tracking_url",
    ],
    filters: { id: found.id },
  })

  if (!order || !samePhone(order.shipping_address?.phone, phone)) return notFound()

  const fulfillments = ((order.fulfillments ?? []) as any[])
    .filter((f) => f && !f.canceled_at)
    .map((f) => ({
      packed_at: f.packed_at ?? null,
      shipped_at: f.shipped_at ?? null,
      delivered_at: f.delivered_at ?? null,
      tracking: (f.labels ?? [])
        .filter((l: any) => l?.tracking_number)
        .map((l: any) => ({ number: l.tracking_number, url: l.tracking_url ?? null })),
    }))

  let status: "canceled" | "delivered" | "shipped" | "packed" | "received" = "received"
  if (order.canceled_at) status = "canceled"
  else if (fulfillments.length && fulfillments.every((f) => f.delivered_at)) status = "delivered"
  else if (fulfillments.some((f) => f.shipped_at)) status = "shipped"
  else if (fulfillments.some((f) => f.packed_at)) status = "packed"

  res.json({
    order: {
      number: (order.metadata as any)?.order_number ?? `#${order.display_id}`,
      placed_at: order.created_at,
      status,
      ship_to: [order.shipping_address?.city, order.shipping_address?.province]
        .filter(Boolean)
        .join(", "),
      items: ((order.items ?? []) as any[]).map((i) => ({
        title: i.product_title || i.title,
        quantity: i.quantity,
      })),
      fulfillments,
    },
  })
}
