import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import * as crypto from "crypto"
import { trackOrderCompleted } from "../lib/analytics"
import { reportError } from "../lib/observability"

/**
 * When an order is placed:
 *  1. the authoritative `order_completed` analytics event is emitted
 *  2. the customer gets a confirmation email (SENDGRID_ORDER_PLACED_TEMPLATE_ID)
 *  3. the admin gets a "new order" alert (ADMIN_NOTIFICATION_EMAIL) so
 *     non-technical staff never have to poll the dashboard
 *
 * Ordering matters: analytics runs **before** the notification module is
 * resolved. That module is absent whenever `SENDGRID_API_KEY` is unset — the
 * state this project currently ships in — and it used to `return` early, which
 * would have silently taken revenue reporting down with the emails.
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

  // Generate unique order number (e.g. ORD-A3B9X2)
  const orderModuleService = container.resolve(Modules.ORDER)
  const randomSuffix = crypto.randomBytes(3).toString("hex").toUpperCase()
  const customOrderNumber = `ORD-${randomSuffix}`

  // Retrieve current order to get its metadata and update it
  const currentOrder = await orderModuleService.retrieveOrder(data.id)
  await orderModuleService.updateOrders(data.id, {
    metadata: {
      ...(currentOrder.metadata || {}),
      order_number: customOrderNumber,
    },
  })

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "customer_id",
      "currency_code",
      "created_at",
      "total",
      "subtotal",
      "shipping_total",
      "items.title",
      "items.product_title",
      "items.quantity",
      "items.total",
      "shipping_methods.name",
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
    reportError(new Error(`Order ${data.id} not found after order.placed`), {
      scope: "subscriber.order-placed",
      extra: { orderId: data.id },
    })
    return
  }

  // ---- authoritative revenue event ------------------------------------
  // Awaited so the flush completes before the handler returns — a worker
  // process can exit immediately afterwards and drop a buffered event.
  // Wrapped because analytics must never affect order placement.
  try {
    await trackOrderCompleted(order.customer_id || order.id, {
      order_id: order.id,
      order_number: customOrderNumber,
      display_id: order.display_id ?? null,
      total: Number(order.total ?? 0),
      subtotal: Number(order.subtotal ?? 0),
      shipping_total: Number(order.shipping_total ?? 0),
      currency: order.currency_code || "usd",
      item_count:
        order.items?.reduce(
          (acc: number, i: any) => acc + Number(i?.quantity ?? 0),
          0
        ) ?? 0,
      items:
        order.items?.map((i: any) => ({
          title: i?.product_title || i?.title,
          quantity: Number(i?.quantity ?? 0),
        })) ?? [],
      shipping_option: order.shipping_methods?.[0]?.name ?? null,
      // Coarse location only — feeds the Exton local-delivery zone sizing in
      // docs/SHIPPING_AUTOMATION_RESEARCH.md. No street address, no name.
      postal_code: order.shipping_address?.postal_code ?? null,
    })
  } catch (e) {
    reportError(e, {
      scope: "subscriber.order-placed.analytics",
      level: "warning",
      extra: { orderId: order.id },
    })
  }

  // ---- emails ---------------------------------------------------------
  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn(
      "[order-placed] notification module not configured (set SENDGRID_API_KEY); skipping order emails"
    )
    return
  }

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (order.currency_code || "usd").toUpperCase(),
  })
  const addr = order.shipping_address
  const templateData = {
    order_id: `#${customOrderNumber}`,
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
