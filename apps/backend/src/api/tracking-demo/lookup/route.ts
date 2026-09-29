import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /tracking-demo/lookup?order=<display_id or order_id>
 *
 * Public — see src/api/tracking-demo/route.ts for why. Rate limited in
 * src/api/middlewares.ts.
 *
 * Emails are masked before leaving this route: this is the one field in an
 * order that's real customer PII, and unlike tracking numbers/items it isn't
 * needed to demonstrate the ship/deliver flow.
 */

function maskEmail(email: string): string {
  const [user, domain] = email.split("@")
  if (!domain) return "***"
  const visible = user.slice(0, 2)
  return `${visible}${"*".repeat(Math.max(user.length - 2, 3))}@${domain}`
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const raw = String(req.query.order ?? "").trim()
  if (!raw) {
    res.status(400).json({ message: "Provide ?order=<display id or order id>" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const isOrderId = raw.startsWith("order_")
  const filters = isOrderId
    ? { id: raw }
    : { display_id: Number.isNaN(Number(raw)) ? -1 : Number(raw) }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "created_at",
      "fulfillments.id",
      "fulfillments.packed_at",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "fulfillments.labels.tracking_number",
      "fulfillments.items.id",
      "fulfillments.items.line_item_id",
      "fulfillments.items.quantity",
      "fulfillments.items.title",
    ],
    filters: filters as any,
  })

  const order = (orders as any[])[0]
  if (!order) {
    res.status(404).json({ message: `No order matching "${raw}"` })
    return
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      email: maskEmail(order.email ?? ""),
      created_at: order.created_at,
    },
    fulfillments: (order.fulfillments ?? []).map((f: any) => ({
      id: f.id,
      packed: !!f.packed_at,
      shipped: !!f.shipped_at,
      shipped_at: f.shipped_at,
      delivered: !!f.delivered_at,
      delivered_at: f.delivered_at,
      canceled: !!f.canceled_at,
      tracking_numbers: Array.from(
        new Set(
          [
            ...(f.labels ?? []).map((l: any) => l.tracking_number),
            f.data?.tracking_number,
            f.data?.easyship_shipment_id,
          ].filter(Boolean)
        )
      ),
      items: (f.items ?? []).map((i: any) => ({
        title: i.title,
        quantity: i.quantity,
      })),
    })),
  })
}
