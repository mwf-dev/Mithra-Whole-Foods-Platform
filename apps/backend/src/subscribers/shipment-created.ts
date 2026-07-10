import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * When the admin marks a fulfillment as shipped, email the customer their
 * tracking number(s). Skipped when the admin unticks "send notifications"
 * on the shipment dialog (no_notification), or when SendGrid /
 * SENDGRID_ORDER_SHIPPED_TEMPLATE_ID isn't configured.
 *
 * Template data contract:
 *   {{order_id}} {{email}}
 *   {{#each tracking}} {{this.number}} {{this.url}} {{/each}}
 */
export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  if (data.no_notification) {
    return
  }

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn(
      "[shipment-created] notification module not configured (set SENDGRID_API_KEY); skipping shipment email"
    )
    return
  }

  const template = process.env.SENDGRID_ORDER_SHIPPED_TEMPLATE_ID
  if (!template) {
    logger.warn(
      "[shipment-created] SENDGRID_ORDER_SHIPPED_TEMPLATE_ID not set; shipment email skipped"
    )
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [fulfillment],
  } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "labels.tracking_number",
      "labels.tracking_url",
      "order.id",
      "order.display_id",
      "order.email",
    ],
    filters: { id: data.id },
  })

  const order = fulfillment?.order
  if (!order?.email) {
    logger.warn(
      `[shipment-created] no order email found for fulfillment ${data.id}; shipment email skipped`
    )
    return
  }

  try {
    await notifications.createNotifications({
      to: order.email,
      channel: "email",
      template,
      data: {
        order_id: `#${order.display_id}`,
        email: order.email,
        tracking:
          fulfillment.labels?.map((l: any) => ({
            number: l?.tracking_number,
            url: l?.tracking_url,
          })) ?? [],
      },
    })
  } catch (e) {
    logger.error(
      `[shipment-created] shipment email failed for fulfillment ${data.id}`,
      e as Error
    )
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
