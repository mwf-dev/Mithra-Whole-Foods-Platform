import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { OPS_LOG_MODULE } from "../modules/ops-log"

/**
 * Operations log (admin → Ops log). One row per email send, Easyship webhook
 * event or label purchase/void, so a failed send or a rejected webhook is
 * visible in the dashboard instead of only inside the Railway logs, and can be
 * retried with one click.
 *
 * Hard rule: logging must NEVER break the operation it logs. Every helper here
 * swallows its own errors — an ops-log outage must not fail an order email, a
 * webhook or a label purchase.
 */

export type OpsKind = "email" | "webhook" | "label"
export type OpsStatus = "ok" | "failed"

export type OpsLogInput = {
  kind: OpsKind
  source: string
  status: OpsStatus
  order_id?: string | null
  email?: string | null
  reference?: string | null
  detail?: string | null
  /** What is needed to replay the operation from the retry endpoint. */
  payload?: Record<string, unknown> | null
}

const DETAIL_MAX = 600
const slice = (v: unknown, max: number) =>
  v == null ? null : String(v).slice(0, max)

export async function logOpsEvent(
  container: MedusaContainer,
  input: OpsLogInput
): Promise<void> {
  try {
    const svc: any = container.resolve(OPS_LOG_MODULE)
    await svc.createOpsLogEvents({
      kind: input.kind,
      source: slice(input.source, 60),
      status: input.status,
      order_id: input.order_id ?? null,
      email: input.email ?? null,
      reference: input.reference ?? null,
      detail: slice(input.detail, DETAIL_MAX),
      payload: input.payload ?? null,
    })
  } catch (e) {
    // Unset env var or DB hiccup may make the module unavailable. Swallow:
    // its consumer already has its own logger.error for the real problem.
    const logger = (() => {
      try {
        return container.resolve("logger") as any
      } catch {
        return null
      }
    })()
    logger?.warn?.(`[ops-log] could not record event: ${e}`)
  }
}

type EmailParams = {
  to: string
  template: string
  data: Record<string, unknown>
}

/**
 * Sends a customer email through Medusa's notification module and records the
 * outcome in the ops log, storing enough data to replay the send from the
 * admin. Subscribers keep their own try/catch: this rethrows on failure so
 * their existing logger.error behaviour is unchanged.
 */
export async function createLoggedNotification(
  container: MedusaContainer,
  params: EmailParams,
  meta: { orderId?: string | null; source?: string } = {}
): Promise<void> {
  const notifications: any = container.resolve(Modules.NOTIFICATION)
  const input: OpsLogInput = {
    kind: "email",
    source: meta.source ?? "resend",
    status: "ok",
    order_id: meta.orderId ?? null,
    email: params.to,
    reference: params.template,
    payload: { to: params.to, template: params.template, data: params.data },
  }
  try {
    await notifications.createNotifications({
      to: params.to,
      channel: "email",
      template: params.template,
      data: params.data,
    })
    await logOpsEvent(container, input)
  } catch (e) {
    await logOpsEvent(container, {
      ...input,
      status: "failed",
      detail: String((e as Error)?.message ?? e),
    })
    throw e
  }
}
