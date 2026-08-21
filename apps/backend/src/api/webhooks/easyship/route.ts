import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { deliverByTrackingNumber } from "../../../lib/fedex-delivery"
import { EasyshipWebhookPayload } from "../../../modules/fulfillment-easyship/types"

const TERMINAL_DELIVERED_STATUSES = new Set([
  "delivered",
  "delivered_to_customer",
  "completed",
])

function isValidEasyshipSignature(
  rawBody: Buffer | string,
  signatureHexOrB64: string,
  secret: string
): boolean {
  if (!secret) return true

  const hmac = crypto.createHmac("sha256", secret).update(rawBody)
  const expectedHex = hmac.digest("hex")
  const expectedB64 = crypto.createHmac("sha256", secret).update(rawBody).digest("base64")

  // Easyship might pass hex or base64 signature in header
  return (
    signatureHexOrB64 === expectedHex ||
    signatureHexOrB64 === expectedB64 ||
    signatureHexOrB64 === `sha256=${expectedHex}`
  )
}

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

  const rawBody = (req as any).rawBody || JSON.stringify(req.body)

  if (webhookSecret && signatureHeader) {
    if (!isValidEasyshipSignature(rawBody, signatureHeader, webhookSecret)) {
      logger.error("[easyship-webhook] Invalid HMAC signature")
      return res.status(401).json({ message: "Invalid signature" })
    }
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
