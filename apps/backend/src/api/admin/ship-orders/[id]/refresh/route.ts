import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EasyshipClient } from "../../../../../modules/fulfillment-easyship/services/easyship-client"
import { activeFulfillments } from "../../../../../lib/ship-orders"
import { deliverByTrackingNumber } from "../../../../../lib/fedex-delivery"
import { recordTrackingEvent } from "../../../../../lib/record-tracking"
import { normalizeStatus } from "../../../../../lib/tracking-events"
import { loadOrder, providerByOption, toRow } from "../../_shared"

/**
 * POST /admin/ship-orders/:id/refresh
 *
 * Asks Easyship for the current tracking state of each courier shipment on the
 * order and applies it, exactly as the webhook would. A safety net for a missed
 * or misconfigured webhook.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })

  const client = new EasyshipClient({ apiKey: process.env.EASYSHIP_API_KEY } as any)
  if (!client.isConfigured) return res.status(409).json({ message: "EASYSHIP_API_KEY is not configured." })

  const notes: string[] = []
  for (const f of activeFulfillments(order.fulfillments) as any[]) {
    const shipmentId = f.data?.easyship_shipment_id as string | undefined
    if (!shipmentId || f.delivered_at) continue
    try {
      const s = await client.getShipment(shipmentId)
      const status = normalizeStatus(s.status)
      if (!status) {
        notes.push(`Easyship reports "${s.status || "no status yet"}".`)
        continue
      }
      if (status === "delivered") {
        await deliverByTrackingNumber(req.scope, s.trackingNumber || shipmentId)
      } else {
        await recordTrackingEvent(req.scope, f.id, { status, at: new Date().toISOString(), source: "easyship" })
      }
    } catch (e: any) {
      return res.status(502).json({ message: e?.message || "Could not reach Easyship." })
    }
  }

  const after = await loadOrder(req.scope, order.id)
  res.json({ order: toRow(after, await providerByOption(req.scope, [after])), notes })
}
