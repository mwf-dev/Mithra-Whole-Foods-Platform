import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { appendEvent, type TrackingEvent } from "./tracking-events"

/** Appends a status event to a fulfillment's history. Returns whether one was added. */
export async function recordTrackingEvent(
  container: MedusaContainer,
  fulfillmentId: string,
  event: TrackingEvent
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [f],
  } = await query.graph({ entity: "fulfillment", fields: ["id", "metadata"], filters: { id: fulfillmentId } })
  if (!f) return false
  const { metadata, added } = appendEvent((f as any).metadata, event)
  if (added) {
    await container.resolve(Modules.FULFILLMENT).updateFulfillment(fulfillmentId, { metadata } as any)
  }
  return added
}

export async function fulfillmentIdByTracking(
  container: MedusaContainer,
  trackingNumber: string
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "canceled_at"],
    filters: { labels: { tracking_number: trackingNumber } } as any,
  })
  const hit = (data as any[]).find((f) => !f.canceled_at)
  return hit?.id ?? null
}
