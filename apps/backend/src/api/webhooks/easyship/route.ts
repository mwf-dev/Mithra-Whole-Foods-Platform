import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isValidEasyshipSignature } from "../../../lib/easyship-signature"
import { normalizeStatus } from "../../../lib/tracking-events"
import { parseEasyshipEvent } from "../../../lib/easyship-webhook"
import { processEasyshipEvent } from "../../../lib/easyship-event"
import { logOpsEvent } from "../../../lib/ops-log"

/**
 * Easyship Webhook Endpoint — receives real-time tracking status & label events.
 *
 * Supported events:
 * - `tracking.status.changed` (in_transit, out_for_delivery, delivered, exception)
 * - `shipment.label.created`
 *
 * Every received event is recorded in the ops log (admin → Ops log) so a
 * missed or failed delivery event is visible in the dashboard, not just in the
 * Railway logs, and can be replayed from there.
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
    await logOpsEvent(req.scope, {
      kind: "webhook",
      source: "easyship",
      status: "failed",
      detail: "Rejected: missing signature header",
    })
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
    await logOpsEvent(req.scope, {
      kind: "webhook",
      source: "easyship",
      status: "failed",
      detail: "Rejected: invalid HMAC signature (possible forged request)",
    })
    return res.status(401).json({ message: "Invalid signature" })
  }

  // Log what Easyship really sends: field names vary by API version.
  logger.info(`[easyship-webhook] payload ${JSON.stringify(req.body ?? {}).slice(0, 2000)}`)

  const parsed = parseEasyshipEvent(req.body)
  const { eventType: event_type, trackingNumber, shipmentId, status } = parsed
  if (!event_type && !trackingNumber && !shipmentId) {
    logger.warn("[easyship-webhook] Unrecognized payload shape")
    await logOpsEvent(req.scope, {
      kind: "webhook",
      source: "easyship",
      status: "ok",
      detail: `Received unrecognized payload shape: ${JSON.stringify(req.body ?? {}).slice(0, 400)}`,
    })
    return res.status(200).json({ received: true })
  }

  logger.info(
    `[easyship-webhook] Event: ${event_type}, Tracking: ${trackingNumber || "N/A"}, Shipment: ${shipmentId || "N/A"}, Status: ${status}`
  )

  try {
    const result = await processEasyshipEvent(req.scope, parsed)

    // Keep every status for the tracking timeline; record the outcome in the
    // ops log either way. A failed recording/delivery must not make Easyship
    // retry (hence the 200 below), but it IS visible and retryable in admin.
    const webhookRow = {
      kind: "webhook" as const,
      source: "easyship",
      status: "ok" as const,
      email: null,
      reference: trackingNumber || shipmentId,
      payload: { eventType: event_type, trackingNumber, shipmentId, status },
      order_id: result.delivery?.orderId ?? null,
      detail: null as string | null,
    }

    if (result.delivery?.attempted) {
      const d = result.delivery
      if (!d.ok) {
        logger.warn(
          `[easyship-webhook] Could not mark delivered for ${trackingNumber}: ${d.reason}`
        )
        await logOpsEvent(req.scope, {
          ...webhookRow,
          status: "failed",
          detail: `Delivered event not applied: ${d.reason ?? "no reason given"}`,
        })
      } else if (d.alreadyDelivered) {
        logger.info(
          `[easyship-webhook] Fulfillment ${d.fulfillmentId} already delivered; duplicate event ignored`
        )
        await logOpsEvent(req.scope, {
          ...webhookRow,
          detail: `Delivered (duplicate event ignored; fulfillment ${d.fulfillmentId})`,
        })
      } else {
        logger.info(
          `[easyship-webhook] Successfully marked fulfillment ${d.fulfillmentId} (Order ${d.orderId}) as delivered`
        )
        await logOpsEvent(req.scope, {
          ...webhookRow,
          order_id: d.orderId ?? webhookRow.order_id,
          detail: `Marked order delivered via Easyship (${d.fulfillmentId})`,
        })
      }
    } else {
      const normalized = normalizeStatus(status)
      const detail = normalized
        ? result.recorded
          ? `Recorded "${normalized}" on the fulfillment timeline`
          : result.note ?? `No matching fulfillment for "${normalized}"`
        : `Received ${event_type || "unknown event"} for tracking ${trackingNumber || shipmentId} (status "${status || "N/A"}" not mapped)`
      if (!result.recorded && result.note) {
        logger.warn(`[easyship-webhook] ${detail}`)
      }
      await logOpsEvent(req.scope, { ...webhookRow, detail })
    }
  } catch (error) {
    logger.error(
      `[easyship-webhook] Error processing delivery event for ${trackingNumber}:`,
      error as Error
    )
    await logOpsEvent(req.scope, {
      kind: "webhook",
      source: "easyship",
      status: "failed",
      reference: trackingNumber || shipmentId,
      payload: { eventType: event_type, trackingNumber, shipmentId, status },
      detail: `Handler error: ${String((error as Error)?.message ?? error)}`,
    })
    return res.status(500).json({ message: "Error processing delivery status" })
  }

  return res.status(200).json({
    received: true,
    event_type,
    tracking_number: trackingNumber || undefined,
  })
}
