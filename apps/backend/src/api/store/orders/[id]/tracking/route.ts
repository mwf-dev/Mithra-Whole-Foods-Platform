import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { publicFulfillments, TRACKING_FIELDS } from "../../../../../lib/tracking-events"

/**
 * GET /store/orders/:id/tracking — shipment progress for a signed-in shopper's
 * own order. Same 404 for "missing" and "not yours" so ids can't be probed.
 * Guests use POST /store/order-lookup instead.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<any> {
  const customerId = req.auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Not authenticated" })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "canceled_at", ...TRACKING_FIELDS],
    filters: { id: req.params.id },
  })
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ message: "Order not found" })
  }
  res.json({ fulfillments: publicFulfillments(order.fulfillments as any[]) })
}
