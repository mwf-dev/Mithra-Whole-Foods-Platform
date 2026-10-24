import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isValidEasyshipSignature } from "../../../lib/easyship-signature"
import { deliverByTrackingNumber } from "../../../lib/fedex-delivery"
import { fulfillmentIdByTracking, recordTrackingEvent } from "../../../lib/record-tracking"
import { normalizeStatus } from "../../../lib/tracking-events"
import { EasyshipWebhookPayload } from "../../../modules/fulfillment-easyship/types"

const TERMINAL_DELIVERED_STATUSES = new Set([
  "delivered",
  "delivered_to_customer",
  "completed",
])

/**
 * Easyship Webhook Endpoint — receives real-time tracking status & label events.
 *
 * Supported events:
 * - `tracking.status.changed` (in_transit, out_for_delivery, delivered, exception)
 * - `shipment.label.created`
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const webhookSecret = process.env.EASYSHIP_WEBHOOK_SECRET

  const signatureHeader =
    (req.headers["x-easyship-signature"] as string) ||
    (req.headers["easyship-signature"] as string) ||
    (req.headers["x-signature"] as string)

  // Fail closed. This route marks real orders delivered (and fires customer
  // emails), so an unsigned or unverifiable request must never get through.
  if (!webhookSecret) {
    logger.error("[easyship-webhook] EASYSHIP_WEBHOOK_SECRET is not set")
    return res.status(500).json({ message: "Webhook secret not configured" })
  }
  if (!signatureHeader) {
    return res.status(401).json({ message: "Missing signature" })
  }

  const rawBody = (req as any).rawBody
  if (!rawBody) {
    // Re-serializing req.body would not reproduce the signed bytes.
    logger.error(
      "[easyship-webhook] rawBody unavailable — check the preserveRawBody bodyParser option for /webhooks/easyship in src/api/middlewares.ts"
    )
    return res.status(500).json({ message: "Cannot verify signature" })
  }

  if (!isValidEasyshipSignature(rawBody, signatureHeader, webhookSecret)) {
    logger.error("[easyship-webhook] Invalid HMAC signature")
    return res.status(401).json({ message: "Invalid signature" })
  }

  const payload = req.body as EasyshipWebhookPayload

  if (!payload || !payload.event_type) {
    logger.warn(
      `[easyship-webhook] Unrecognized payload shape: ${JSON.stringify(req.body)}`
    )
    return res.status(200).json({ received: true })
  }

  const { event_type, data } = payload
  const trackingNumber = data?.tracking_number
  const status = data?.status?.toLowerCase() || ""

  logger.info(
    `[easyship-webhook] Event: ${event_type}, Tracking: ${trackingNumber || "N/A"}, Status: ${status}`
  )

  // Keep every status for the tracking timeline. Failing to record must not
  // make Easyship retry (and must never block the delivered handling below).
  const normalized = normalizeStatus(status)
  if (trackingNumber && normalized && normalized !== "delivered") {
    try {
      const fulfillmentId = await fulfillmentIdByTracking(req.scope, trackingNumber)
      if (fulfillmentId) {
        await recordTrackingEvent(req.scope, fulfillmentId, {
          status: normalized,
          at: new Date().toISOString(),
          source: "easyship",
        })
      }
    } catch (error) {
      logger.error(`[easyship-webhook] Could not record ${normalized} for ${trackingNumber}`, error as Error)
    }
  }

  if (trackingNumber && TERMINAL_DELIVERED_STATUSES.has(status)) {
    try {
      const result = await deliverByTrackingNumber(req.scope, trackingNumber)

      if (!result.ok) {
        logger.warn(
          `[easyship-webhook] Could not mark delivered for ${trackingNumber}: ${result.reason}`
        )
      } else if (result.alreadyDelivered) {
        logger.info(
          `[easyship-webhook] Fulfillment ${result.fulfillmentId} already delivered; duplicate event ignored`
        )
      } else {
        logger.info(
          `[easyship-webhook] Successfully marked fulfillment ${result.fulfillmentId} (Order ${result.orderId}) as delivered`
        )
      }
    } catch (error) {
      logger.error(
        `[easyship-webhook] Error processing delivery event for ${trackingNumber}:`,
        error as Error
      )
      return res.status(500).json({ message: "Error processing delivery status" })
    }
  }

  return res.status(200).json({
    received: true,
    event_type,
    tracking_number: trackingNumber,
  })
}
