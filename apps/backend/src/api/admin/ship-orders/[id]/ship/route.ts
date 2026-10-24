import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"
import { activeFulfillments, genericTrackingUrl, isValidTrackingNumber } from "../../../../../lib/ship-orders"
import { recordTrackingEvent } from "../../../../../lib/record-tracking"
import { loadOrder, providerByOption, toRow } from "../../_shared"

/**
 * POST /admin/ship-orders/:id/ship
 * Body: { fulfillment_id, tracking_number?, tracking_url?, notify? }
 *
 * Marks a packed fulfillment as shipped. If the fulfillment already carries a
 * purchased label's tracking number nothing needs to be typed; otherwise a
 * tracking number is required. `notify` (default true) sends the customer's
 * "your order shipped" email through the existing shipment.created subscriber.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const body = (req.body ?? {}) as {
    fulfillment_id?: string
    tracking_number?: string
    tracking_url?: string
    notify?: boolean
  }

  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })

  const fulfillment: any = activeFulfillments(order.fulfillments).find((f: any) => f.id === body.fulfillment_id)
  if (!fulfillment) return res.status(404).json({ message: "Shipment not found on this order." })
  if (fulfillment.shipped_at) return res.status(409).json({ message: "Already marked as shipped." })

  const method = fulfillment.metadata?.delivery_method as string | undefined
  const hasLabel = (fulfillment.labels ?? []).some((l: any) => l?.tracking_number)
  const labels: { tracking_number: string; tracking_url: string; label_url: string }[] = []

  // A label bought at the Pack step is parked in fulfillment.data until now.
  const parked = fulfillment.data?.tracking_number as string | undefined

  if (!hasLabel && parked) {
    labels.push({
      tracking_number: parked,
      tracking_url: (fulfillment.data?.tracking_url as string) || genericTrackingUrl(parked),
      label_url: (fulfillment.data?.label_url as string) || "",
    })
  } else if (!hasLabel && method === "manual") {
    // Hand delivery has no carrier number. An optional reference is still kept.
    if (isValidTrackingNumber(body.tracking_number)) {
      const n = body.tracking_number.trim()
      labels.push({ tracking_number: n, tracking_url: "", label_url: "" })
    }
  } else if (!hasLabel) {
    if (!isValidTrackingNumber(body.tracking_number)) {
      return res.status(400).json({ message: "Enter the carrier's tracking number." })
    }
    const n = body.tracking_number.trim()
    let url = genericTrackingUrl(n)
    if (typeof body.tracking_url === "string" && /^https:\/\//i.test(body.tracking_url.trim())) {
      url = body.tracking_url.trim()
    }
    labels.push({ tracking_number: n, tracking_url: url, label_url: "" })
  }

  try {
    await createOrderShipmentWorkflow(req.scope).run({
      input: {
        order_id: order.id,
        fulfillment_id: fulfillment.id,
        items: (fulfillment.items ?? []).map((i: any) => ({ id: i.line_item_id, quantity: Number(i.quantity) })),
        labels,
        no_notification: body.notify === false,
      } as any,
    })
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || "Could not mark the shipment as shipped." })
  }

  await recordTrackingEvent(req.scope, fulfillment.id, {
    status: method === "manual" ? "out_for_delivery" : "in_transit",
    at: new Date().toISOString(),
    source: "admin",
  }).catch(() => undefined)

  const fresh = await loadOrder(req.scope, order.id)
  res.json({ order: toRow(fresh, await providerByOption(req.scope, [fresh])) })
}
