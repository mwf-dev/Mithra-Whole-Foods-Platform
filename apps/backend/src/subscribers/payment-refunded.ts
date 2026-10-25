import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveTemplate } from "../lib/email"
import { createLoggedNotification } from "../lib/ops-log"
import { formatMoney, latestRefundAmount } from "../lib/refund-email"

/**
 * `payment.refunded` ({ id: payment id }) is emitted by Medusa's refund
 * workflow, so this covers refunds issued from the admin order page.
 * Payment → payment collection → order goes through the
 * order_payment_collection link.
 */
export default async function paymentRefundedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn("[payment-refunded] notification module not configured; refund email skipped")
    return
  }
  const template = resolveTemplate("order-refunded", "SENDGRID_ORDER_REFUNDED_TEMPLATE_ID")
  if (!template) return

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [payment],
    } = await query.graph({
      entity: "payment",
      fields: ["id", "currency_code", "payment_collection_id", "refunds.amount", "refunds.created_at"],
      filters: { id: data.id },
    })
    if (!payment?.payment_collection_id) return

    const {
      data: [link],
    } = await query.graph({
      entity: "order_payment_collection",
      fields: ["order_id"],
      filters: { payment_collection_id: payment.payment_collection_id },
    })
    if (!link?.order_id) return

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email", "metadata", "currency_code"],
      filters: { id: link.order_id },
    })
    if (!order?.email) return

    const amount = latestRefundAmount((payment as any).refunds)
    await createLoggedNotification(
      container,
      {
        to: order.email,
        template,
        data: {
          order_id: `#${(order.metadata as any)?.order_number ?? order.display_id}`,
          amount: amount === null ? "your payment" : formatMoney(amount, payment.currency_code ?? order.currency_code),
        },
      },
      { orderId: order.id }
    )
  } catch (e) {
    logger.error(`[payment-refunded] refund email failed for payment ${data.id}`, e as Error)
  }
}

export const config: SubscriberConfig = {
  event: "payment.refunded",
}
