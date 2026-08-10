import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { deliverByTrackingNumber } from "../../../lib/fedex-delivery"

/**
 * FedEx Webhook Endpoint — receives tracking status updates from FedEx.
 *
 * ⚠️ UNVERIFIED AGAINST A REAL PAYLOAD. Everything below was built from FedEx's
 * public docs (developer.fedex.com), not a live sandbox response — that needs
 * an Organization profile + signed Order Form, which this project does not
 * have yet. Two things below are already corrections of a first guess that
 * was checked against docs and turned out wrong:
 *
 *   - Signature encoding is **base64**, not hex. FedEx Supply Chain's own
 *     example: `base64_encode(hash_hmac('sha256', $data, $secret, true))`.
 *   - The header name `X-Fdx-Sc-Signature` belongs to *FedEx Supply Chain's*
 *     webhook product specifically ("Sc" = Supply Chain), not the general
 *     Track API. Confirm which product you're actually enrolled in before
 *     relying on this header name.
 *
 * Event parsing tries several shapes because FedEx's public Track API
 * *response* schema (`trackingNumberInfo.trackingNumber` /
 * `latestStatusDetail.code`) is documented, but the *webhook push envelope*
 * is not — it may or may not match. On an unrecognized shape this logs the
 * full raw payload so the first real delivery confirms (or corrects) the
 * parsing without guesswork.
 *
 * On a delivery event this marks the matching fulfillment delivered in Medusa
 * via `markOrderFulfillmentAsDeliveredWorkflow` (through the shared
 * `deliverByTrackingNumber` helper — the public /tracking-demo page calls the
 * same helper, so a manual click there exercises this exact code path). That
 * workflow emits `delivery.created`, which the `shipment-delivered` subscriber
 * turns into the customer email.
 *
 * Signature verification is HMAC-SHA256 over the **raw request bytes** —
 * `preserveRawBody` is enabled for this route in `src/api/middlewares.ts`.
 */

const DELIVERED_CODES = new Set(["DL", "DLV", "DELIVERED"])

function isValidSignature(
  rawBody: Buffer | string,
  signatureB64: string,
  secret: string
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest()
  let provided: Buffer
  try {
    provided = Buffer.from(signatureB64, "base64")
  } catch {
    return false
  }
  if (expected.length !== provided.length) {
    return false
  }
  return crypto.timingSafeEqual(expected, provided)
}

type NormalizedEvent = { trackingNumber: string; statusCode: string }

/**
 * Accepts three plausible envelope shapes and normalizes to
 * { trackingNumber, statusCode }. Returns [] (not a throw) for anything
 * unrecognized — the caller logs the raw body in that case.
 */
function extractEvents(body: any): NormalizedEvent[] {
  const events: NormalizedEvent[] = []

  // Shape A: { trackEvents: [{ trackingNumber, eventType }] }
  if (Array.isArray(body?.trackEvents)) {
    for (const e of body.trackEvents) {
      if (e?.trackingNumber && e?.eventType) {
        events.push({ trackingNumber: e.trackingNumber, statusCode: e.eventType })
      }
    }
  }

  // Shape B: Track API response shape, single object —
  // { trackingNumberInfo: { trackingNumber }, latestStatusDetail: { code } }
  if (body?.trackingNumberInfo?.trackingNumber && body?.latestStatusDetail?.code) {
    events.push({
      trackingNumber: body.trackingNumberInfo.trackingNumber,
      statusCode: body.latestStatusDetail.code,
    })
  }

  // Shape C: { trackingNumberInfo: [...] } / { output: { completeTrackResults: [...] } }
  // wrappers some FedEx endpoints use — walk one level of nesting defensively.
  const results =
    body?.output?.completeTrackResults ?? body?.completeTrackResults ?? null
  if (Array.isArray(results)) {
    for (const r of results) {
      for (const t of r?.trackResults ?? []) {
        const tn = r?.trackingNumber ?? t?.trackingNumberInfo?.trackingNumber
        const code = t?.latestStatusDetail?.code
        if (tn && code) {
          events.push({ trackingNumber: tn, statusCode: code })
        }
      }
    }
  }

  return events
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const webhookSecret = process.env.FEDEX_WEBHOOK_SECRET

  if (!webhookSecret) {
    logger.warn("[fedex-webhook] FEDEX_WEBHOOK_SECRET is not set")
    return res.status(500).json({ message: "Webhook secret not configured" })
  }

  const signature = req.headers["x-fdx-sc-signature"] as string
  if (!signature) {
    return res.status(401).json({ message: "Missing signature" })
  }

  const rawBody = (req as any).rawBody
  if (!rawBody) {
    // Fail closed. Falling back to JSON.stringify(req.body) would accept some
    // forged payloads and reject some genuine ones — worse than an outage.
    logger.error(
      "[fedex-webhook] rawBody unavailable — check the preserveRawBody bodyParser option for /webhooks/fedex in src/api/middlewares.ts"
    )
    return res.status(500).json({ message: "Cannot verify signature" })
  }

  if (!isValidSignature(rawBody, signature, webhookSecret)) {
    logger.error("[fedex-webhook] Invalid signature")
    return res.status(401).json({ message: "Invalid signature" })
  }

  const events = extractEvents(req.body)

  if (events.length === 0) {
    // Payload shape didn't match anything we anticipated. Log it in full so
    // the first real FedEx delivery tells us what to add to extractEvents().
    logger.warn(
      `[fedex-webhook] No recognized events in payload: ${JSON.stringify(req.body)}`
    )
    return res.status(200).json({ received: true })
  }

  let failed = 0

  for (const { trackingNumber, statusCode } of events) {
    logger.info(`[fedex-webhook] Received update for ${trackingNumber}: ${statusCode}`)

    if (!DELIVERED_CODES.has(statusCode)) {
      continue
    }

    try {
      const result = await deliverByTrackingNumber(req.scope, trackingNumber)

      if (!result.ok) {
        if (result.reason === "not_found") {
          logger.warn(
            `[fedex-webhook] No fulfillment found for tracking number ${trackingNumber}`
          )
        } else if (result.reason === "canceled") {
          logger.warn(
            `[fedex-webhook] Fulfillment for ${trackingNumber} is canceled; ignoring delivery event`
          )
        } else {
          logger.warn(
            `[fedex-webhook] Fulfillment for ${trackingNumber} has no linked order; cannot mark delivered`
          )
        }
        continue
      }

      // FedEx retries until it gets a 2xx, so it can resend the same terminal
      // event more than once — this is expected, not an error.
      if (result.alreadyDelivered) {
        logger.info(
          `[fedex-webhook] Fulfillment ${result.fulfillmentId} already delivered; ignoring duplicate`
        )
        continue
      }

      logger.info(
        `[fedex-webhook] Marked fulfillment ${result.fulfillmentId} (order ${result.orderId}) as delivered`
      )
    } catch (error) {
      failed++
      logger.error(
        `[fedex-webhook] Failed to process delivery for ${trackingNumber}`,
        error as Error
      )
    }
  }

  // A non-2xx makes FedEx retry. That is what we want when something genuinely
  // broke — the handler is idempotent, so a replay is safe.
  if (failed > 0) {
    return res.status(500).json({ message: `Failed to process ${failed} event(s)` })
  }

  return res.status(200).json({ received: true })
}
