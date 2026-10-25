import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveTemplate } from "../lib/email"
import { createLoggedNotification } from "../lib/ops-log"

/** Tells the customer their order was canceled (admin cancel or cancel workflow). */
export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn("[order-canceled] notification module not configured; cancel email skipped")
    return
  }
  const template = resolveTemplate("order-canceled", "SENDGRID_ORDER_CANCELED_TEMPLATE_ID")
  if (!template) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "email", "metadata"],
    filters: { id: data.id },
  })
  if (!order?.email) return

  try {
    await createLoggedNotification(
      container,
      {
        to: order.email,
        template,
        data: { order_id: `#${(order.metadata as any)?.order_number ?? order.display_id}` },
      },
      { orderId: order.id }
    )
  } catch (e) {
    logger.error(`[order-canceled] cancel email failed for ${data.id}`, e as Error)
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
