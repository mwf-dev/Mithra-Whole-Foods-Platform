import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * When an order is placed:
 *  1. the customer gets a confirmation email (SENDGRID_ORDER_PLACED_TEMPLATE_ID)
 *  2. the admin gets a "new order" alert (ADMIN_NOTIFICATION_EMAIL) so
 *     non-technical staff never have to poll the dashboard
 *
 * Emails require the SendGrid notification module (SENDGRID_API_KEY). Without
 * it — or without template ids — this logs and returns; order placement is
 * never blocked by email failures.
 *
 * Template data contract (SendGrid dynamic templates, handlebars):
 *   {{order_id}} {{order_date}} {{email}} {{subtotal}} {{shipping_total}}
 *   {{total}} {{shipping_address}}
 *   {{#each items}} {{this.title}} {{this.quantity}} {{this.total}} {{/each}}
 * Keep docs/STRIPE_SETUP.md in sync when changing this shape.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn(
      "[order-placed] notification module not configured (set SENDGRID_API_KEY); skipping order emails"
    )
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "created_at",
      "total",
      "subtotal",
      "shipping_total",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.total",
      "shipping_address.first_name",
      "shipping_address.last_name",
      "shipping_address.address_1",
      "shipping_address.address_2",
      "shipping_address.city",
      "shipping_address.province",
      "shipping_address.postal_code",
      "shipping_address.country_code",
    ],
    filters: { id: data.id },
  })

  if (!order) {
    logger.error(`[order-placed] order ${data.id} not found`)
    return
  }

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (order.currency_code || "usd").toUpperCase(),
  })
  const addr = order.shipping_address
  const templateData = {
    order_id: `#${order.display_id}`,
    order_date: new Date(order.created_at as string).toLocaleDateString(
      "en-US",
      { year: "numeric", month: "long", day: "numeric" }
    ),
    email: order.email,
    subtotal: money.format(Number(order.subtotal ?? 0)),
    shipping_total: money.format(Number(order.shipping_total ?? 0)),
    total: money.format(Number(order.total ?? 0)),
    items:
      order.items?.map((i: any) => ({
        title: i?.product_title || i?.title,
        quantity: i?.quantity,
        total: money.format(Number(i?.total ?? 0)),
      })) ?? [],
    shipping_address: addr
      ? [
          `${addr.first_name ?? ""} ${addr.last_name ?? ""}`.trim(),
          addr.address_1,
          addr.address_2,
          `${addr.city ?? ""}, ${addr.province ?? ""} ${addr.postal_code ?? ""}`.trim(),
          addr.country_code?.toUpperCase(),
        ]
          .filter(Boolean)
          .join(", ")
      : "",
  }

  const customerTemplate = process.env.SENDGRID_ORDER_PLACED_TEMPLATE_ID
  if (customerTemplate && order.email) {
    try {
      await notifications.createNotifications({
        to: order.email,
        channel: "email",
        template: customerTemplate,
        data: templateData,
      })
    } catch (e) {
      logger.error(`[order-placed] customer email failed for ${data.id}`, e as Error)
    }
  } else {
    logger.warn(
      "[order-placed] SENDGRID_ORDER_PLACED_TEMPLATE_ID not set; customer confirmation skipped"
    )
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL
  const adminTemplate =
    process.env.SENDGRID_ADMIN_NEW_ORDER_TEMPLATE_ID || customerTemplate
  if (adminEmail && adminTemplate) {
    try {
      await notifications.createNotifications({
        to: adminEmail,
        channel: "email",
        template: adminTemplate,
        data: templateData,
      })
    } catch (e) {
      logger.error(`[order-placed] admin alert failed for ${data.id}`, e as Error)
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
