import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import { missingForShipping, paymentState, remainingItems } from "../../../../../lib/ship-orders"
import { loadOrder, providerByOption, toRow } from "../../_shared"

/**
 * POST /admin/ship-orders/:id/fulfill
 *
 * Packs whatever is still unfulfilled. When the customer chose the Easyship
 * option, the workflow's provider call buys the label and records the tracking
 * number; for manual options it just creates the fulfillment and the packer
 * types the tracking number when marking it shipped.
 *
 * Refuses (409) when payment hasn't completed or the address is incomplete, so
 * a label is never bought for an order that can't be delivered or paid for.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })

  const items = remainingItems(order.items, order.fulfillments)
  if (!items.length) return res.status(409).json({ message: "Nothing left to pack on this order." })

  const missing = missingForShipping(order.shipping_address, order.email)
  if (missing.length) {
    return res.status(409).json({ message: `Can't ship yet: missing ${missing.join(", ")}.` })
  }
  if (paymentState(order.payment_collections) === "unpaid") {
    return res.status(409).json({ message: "Can't ship yet: payment hasn't completed." })
  }

  try {
    await createOrderFulfillmentWorkflow(req.scope).run({
      input: { order_id: order.id, items, no_notification: true } as any,
    })
  } catch (e: any) {
    // Surface the provider's own message (e.g. Easyship rejecting an address).
    return res.status(502).json({ message: e?.message || "Could not create the shipment." })
  }

  const fresh = await loadOrder(req.scope, order.id)
  res.json({ order: toRow(fresh, await providerByOption(req.scope, [fresh])) })
}
