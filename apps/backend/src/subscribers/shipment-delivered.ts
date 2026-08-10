import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * When a fulfillment is marked delivered, email the customer.
 *
 * Bound to Medusa's native `delivery.created`, which
 * `markOrderFulfillmentAsDeliveredWorkflow` emits — so this covers both the
 * FedEx webhook and an admin marking delivery by hand in the dashboard. Don't
 * point it back at a custom event: that silently drops the manual path.
 *
 * Template data contract:
 *   {{order_id}} {{email}}
 *   {{#each tracking}} {{this.number}} {{this.url}} {{/each}}
 */
export default async function shipmentDeliveredHandler({
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
      "[shipment-delivered] notification module not configured; skipping delivery email"
    )
    return
  }

  const template = process.env.SENDGRID_ORDER_DELIVERED_TEMPLATE_ID
  if (!template) {
    logger.warn(
      "[shipment-delivered] SENDGRID_ORDER_DELIVERED_TEMPLATE_ID not set; delivery email skipped"
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
      `[shipment-delivered] no order email found for fulfillment ${data.id}`
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
      `[shipment-delivered] delivery email failed for fulfillment ${data.id}`,
      e as Error
    )
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
