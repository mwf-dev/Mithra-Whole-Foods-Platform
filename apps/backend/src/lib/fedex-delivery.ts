import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { markOrderFulfillmentAsDeliveredWorkflow } from "@medusajs/medusa/core-flows"
import type { MedusaContainer } from "@medusajs/framework/types"

/**
 * Shared by the real FedEx webhook (src/api/webhooks/fedex/route.ts) and the
 * public tracking demo page (src/api/tracking-demo/deliver/route.ts) so a
 * manual click on that page exercises the exact same code path a live FedEx
 * delivery event would — not a lookalike.
 */
export type DeliverByTrackingResult =
  | { ok: true; fulfillmentId: string; orderId: string; alreadyDelivered: false }
  | { ok: true; fulfillmentId: string; orderId: string; alreadyDelivered: true }
  | { ok: false; reason: "not_found" | "canceled" | "no_order" }

export async function deliverByTrackingNumber(
  container: MedusaContainer,
  trackingNumber: string
): Promise<DeliverByTrackingResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "delivered_at", "canceled_at", "order.id"],
    filters: { labels: { tracking_number: trackingNumber } } as any,
  })

  const fulfillment = fulfillments?.[0] as any
  if (!fulfillment) {
    return { ok: false, reason: "not_found" }
  }
  if (fulfillment.canceled_at) {
    return { ok: false, reason: "canceled" }
  }

  const orderId = fulfillment.order?.id
  if (!orderId) {
    return { ok: false, reason: "no_order" }
  }

  if (fulfillment.delivered_at) {
    return {
      ok: true,
      fulfillmentId: fulfillment.id,
      orderId,
      alreadyDelivered: true,
    }
  }

  await markOrderFulfillmentAsDeliveredWorkflow(container).run({
    input: { orderId, fulfillmentId: fulfillment.id },
  })

  return {
    ok: true,
    fulfillmentId: fulfillment.id,
    orderId,
    alreadyDelivered: false,
  }
}
