import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deliverByTrackingNumber } from "../../../lib/fedex-delivery"

/**
 * POST /tracking-demo/deliver
 * Body: { tracking_number: string }
 *
 * Public — see src/api/tracking-demo/route.ts. Calls the exact same
 * `deliverByTrackingNumber` helper the real `/webhooks/fedex` endpoint calls —
 * this route IS the webhook's state-changing logic, minus the HMAC check
 * (this route has no signature to check since it's driven by a human clicking
 * a button, not FedEx). A pass here means the workflow that runs on a real
 * FedEx delivery event works end to end.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { tracking_number } = (req.body as any) ?? {}

  if (!tracking_number) {
    res.status(400).json({ message: "tracking_number is required" })
    return
  }

  const result = await deliverByTrackingNumber(req.scope, tracking_number)

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: `No fulfillment has tracking number "${tracking_number}"`,
      canceled: "That fulfillment is canceled",
      no_order: "That fulfillment has no linked order",
    }
    res.status(404).json({ message: messages[result.reason] })
    return
  }

  res.json({
    ok: true,
    fulfillment_id: result.fulfillmentId,
    order_id: result.orderId,
    already_delivered: result.alreadyDelivered,
  })
}
