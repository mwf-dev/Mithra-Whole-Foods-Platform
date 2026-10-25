import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { OPS_LOG_MODULE } from "../../../../../modules/ops-log"
import { createLoggedNotification } from "../../../../../lib/ops-log"
import { processEasyshipEvent } from "../../../../../lib/easyship-event"

/**
 * POST /admin/ops-log/:id/retry — replay a failed operation.
 *
 *   email   → re-send the stored {to, template, data} via the notification
 *             module and log the replay as its own row (source "admin").
 *   webhook → re-run the stored Easyship event through the same processing the
 *             live webhook uses (record a status / mark delivered).
 *   label   → 400: buying a label costs money and belongs to Ship orders; the
 *             row carries the order id to do it from there.
 *
 * Idempotence notes: email replays may double-deliver to the inbox if the
 * first attempt actually succeeded but the response was lost (rare); webhook
 * replays are idempotent (status appends and delivered-marking both no-op on
 * repeats).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const svc = req.scope.resolve(OPS_LOG_MODULE) as any
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { id } = req.params

  const row = await svc.retrieveOpsLogEvent(id)
  if (!row) return res.status(404).json({ message: "Log entry not found" })

  const retryNote = (detail: string | null, note: string) =>
    `${detail ? detail + " | " : ""}${note}`.slice(0, 600)

  if (row.kind === "label") {
    return res.status(400).json({
      message:
        "Labels cannot be replayed automatically — buy the label again from Ship orders for this order.",
      order_id: row.order_id ?? null,
    })
  }

  if (row.kind === "email") {
    const payload = (row.payload ?? {}) as { to?: string; template?: string; data?: unknown }
    if (!payload.to || !payload.template) {
      return res.status(409).json({ message: "This row has nothing to re-send." })
    }
    try {
      await createLoggedNotification(
        req.scope,
        {
          to: payload.to,
          template: payload.template,
          data: (payload.data ?? {}) as Record<string, unknown>,
        },
        { orderId: row.order_id ?? null, source: "admin" }
      )
    } catch (e: any) {
      const notConfigured = !process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY
      const message = notConfigured
        ? "Email provider is not configured (set RESEND_API_KEY) — nothing was sent."
        : `Retry failed: ${e?.message ?? e}`
      logger.warn(`[ops-log] email retry ${id}: ${message}`)
      return res.status(notConfigured ? 409 : 502).json({ message })
    }
    await svc.updateOpsLogEvents(id, {
      retried_at: new Date(),
      status: "ok",
      detail: retryNote(row.detail, "retried OK from Ops log"),
    })
    return res.json({ retried: true })
  }

  // kind === "webhook": replay the parsed Easyship event.
  const payload = (row.payload ?? {}) as {
    eventType?: string
    trackingNumber?: string
    shipmentId?: string
    status?: string
  }
  if (!payload.trackingNumber && !payload.shipmentId) {
    return res.status(409).json({ message: "This webhook row has no reference to replay." })
  }
  let outcome
  try {
    outcome = await processEasyshipEvent(req.scope, {
      eventType: payload.eventType ?? "",
      trackingNumber: payload.trackingNumber ?? "",
      shipmentId: payload.shipmentId ?? "",
      status: payload.status ?? "",
    })
  } catch (e: any) {
    await svc.updateOpsLogEvents(id, {
      retried_at: new Date(),
      detail: retryNote(row.detail, `retry error: ${e?.message ?? e}`),
    })
    return res.status(502).json({ message: e?.message ?? "Retry failed" })
  }

  const deliveredOk =
    outcome.delivery?.attempted && outcome.delivery?.ok && !outcome.delivery?.alreadyDelivered
  const applied = outcome.recorded || deliveredOk || outcome.delivery?.alreadyDelivered
  if (applied) {
    await svc.updateOpsLogEvents(id, {
      retried_at: new Date(),
      status: "ok",
      order_id: outcome.delivery?.orderId ?? row.order_id,
      detail: retryNote(row.detail, "retried OK from Ops log"),
    })
    return res.json({ retried: true })
  }

  const reason = outcome.delivery?.reason ?? outcome.note ?? "no change applied"
  await svc.updateOpsLogEvents(id, {
    retried_at: new Date(),
    detail: retryNote(row.detail, `retry did not apply: ${reason}`),
  })
  return res.status(409).json({ message: reason })
}
