import { normalizeStatus } from "./tracking-events"
import { deliverByTrackingNumber } from "./fedex-delivery"
import { fulfillmentIdByTracking, recordTrackingEvent } from "./record-tracking"
import type { ParsedEasyshipEvent } from "./easyship-webhook"
import type { MedusaContainer } from "@medusajs/framework/types"

export type DeliveryOutcome = {
  ok: boolean
  alreadyDelivered?: boolean
  fulfillmentId?: string
  orderId?: string
  reason?: string
}

export type ProcessedEasyshipEvent = {
  /** Whether a non-delivered status was appended to the fulfillment timeline. */
  recorded: boolean
  /** Set when the event was (or attempted as) a delivery. */
  delivery: (DeliveryOutcome & { attempted: boolean }) | null
  /** Non-fatal problem (a status could not be matched to a fulfillment, …). */
  note?: string
}

/**
 * Shared core of the Easyship webhook handling: record every non-delivered
 * status on the fulfillment timeline, and mark the fulfillment delivered (with
 * emails) on a delivered event. Used by BOTH the webhook route and the ops-log
 * retry endpoint — if you change the handling, both paths stay in sync.
 *
 * Never throws: every step degrades to `recorded: false` / `delivery: { ok:
 * false, reason }` so Easyship is not retried into spam and the caller can
 * log the outcome to the ops log.
 */
export async function processEasyshipEvent(
  scope: MedusaContainer,
  event: ParsedEasyshipEvent
): Promise<ProcessedEasyshipEvent> {
  const trackingNumber = event.trackingNumber || ""
  const shipmentId = event.shipmentId || ""
  if (!trackingNumber && !shipmentId) return { recorded: false, delivery: null }

  const normalized = normalizeStatus(event.status)

  if (normalized && normalized !== "delivered") {
    try {
      const fulfillmentId = await fulfillmentIdByTracking(scope, trackingNumber, shipmentId)
      if (fulfillmentId) {
        const added = await recordTrackingEvent(scope, fulfillmentId, {
          status: normalized,
          at: new Date().toISOString(),
          source: "easyship",
        })
        return { recorded: added, delivery: null }
      }
      return { recorded: false, delivery: null, note: `No fulfillment matches tracking ${trackingNumber || shipmentId}` }
    } catch (error) {
      return { recorded: false, delivery: null, note: String((error as Error)?.message ?? error) }
    }
  }

  if (normalized === "delivered") {
    try {
      const result = await deliverByTrackingNumber(scope, trackingNumber || shipmentId)
      return { recorded: false, delivery: { attempted: true, ...result } }
    } catch (error) {
      return {
        recorded: false,
        delivery: {
          attempted: true,
          ok: false,
          reason: String((error as Error)?.message ?? error),
        },
      }
    }
  }

  return { recorded: false, delivery: null }
}
