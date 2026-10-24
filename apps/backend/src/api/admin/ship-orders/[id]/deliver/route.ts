import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/medusa/core-flows"
import { activeFulfillments } from "../../../../../lib/ship-orders"
import { recordTrackingEvent } from "../../../../../lib/record-tracking"
import { loadOrder, providerByOption, toRow } from "../../_shared"

/**
 * POST /admin/ship-orders/:id/deliver
 * Body: { fulfillment_id }
 *
 * "Mark delivered" for hand-delivered (manual) shipments. Courier shipments are
 * marked by Easyship's webhook, so this refuses them: a click here would tell
 * the customer "delivered" while the parcel is still with the carrier.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const body = (req.body ?? {}) as { fulfillment_id?: string }
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })

  const f: any = activeFulfillments(order.fulfillments).find((x: any) => x.id === body.fulfillment_id)
  if (!f) return res.status(404).json({ message: "Shipment not found on this order." })
  if (f.metadata?.delivery_method !== "manual") {
    return res.status(409).json({ message: "Courier shipments are marked delivered automatically by the carrier." })
  }
  if (!f.shipped_at) return res.status(409).json({ message: "Mark it out for delivery first." })
  if (f.delivered_at) return res.status(409).json({ message: "Already delivered." })

  try {
    await markOrderFulfillmentAsDeliveredWorkflow(req.scope).run({
      input: { orderId: order.id, fulfillmentId: f.id },
    })
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || "Could not mark the order delivered." })
  }
  await recordTrackingEvent(req.scope, f.id, {
    status: "delivered",
    at: new Date().toISOString(),
    source: "admin",
  }).catch(() => undefined)

  const fresh = await loadOrder(req.scope, order.id)
  res.json({ order: toRow(fresh, await providerByOption(req.scope, [fresh])) })
}
