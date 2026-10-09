import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  activeFulfillments,
  deriveStage,
  missingForShipping,
  paymentState,
  remainingItems,
} from "../../../lib/ship-orders"

export const ORDER_FIELDS = [
  "id",
  "display_id",
  "created_at",
  "canceled_at",
  "email",
  "total",
  "currency_code",
  "metadata",
  "items.id",
  "items.title",
  "items.product_title",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "items.detail.quantity",
  "items.detail.fulfilled_quantity",
  "summary.current_order_total",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
  "shipping_methods.name",
  "shipping_methods.shipping_option_id",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
  "fulfillments.id",
  "fulfillments.packed_at",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "fulfillments.items.line_item_id",
  "fulfillments.items.quantity",
  "fulfillments.labels.tracking_number",
  "fulfillments.labels.tracking_url",
  "fulfillments.labels.label_url",
]

/** shipping_option_id -> provider_id, resolved once per request. */
export async function providerByOption(
  container: MedusaContainer,
  orders: any[]
): Promise<Map<string, string>> {
  const ids = [
    ...new Set(
      orders.flatMap((o) => (o.shipping_methods ?? []).map((m: any) => m?.shipping_option_id)).filter(Boolean)
    ),
  ] as string[]
  const map = new Map<string, string>()
  if (!ids.length) return map
  const fulfillment = container.resolve(Modules.FULFILLMENT)
  const options = await fulfillment.listShippingOptions({ id: ids }, { select: ["id", "provider_id"] })
  for (const o of options) map.set(o.id, o.provider_id)
  return map
}

export function toRow(order: any, providers: Map<string, string>) {
  const a = order.shipping_address ?? {}
  const active = activeFulfillments(order.fulfillments)
  const method = order.shipping_methods?.[0]
  const provider = method?.shipping_option_id ? providers.get(method.shipping_option_id) ?? null : null
  const payment = paymentState(order.payment_collections)
  const missing = missingForShipping(a, order.email)
  const pending = remainingItems(order.items, order.fulfillments)

  return {
    id: order.id,
    number: order.metadata?.order_number ?? `#${order.display_id}`,
    placed_at: order.created_at,
    stage: deriveStage(order.items, order.fulfillments),
    customer: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || order.email,
    email: order.email ?? null,
    phone: a.phone ?? null,
    address: [a.address_1, a.address_2, `${a.city ?? ""}, ${a.province ?? ""} ${a.postal_code ?? ""}`.trim(), a.country_code?.toUpperCase()]
      .filter(Boolean)
      .join(", "),
    items: (order.items ?? []).map((i: any) => ({
      title: i.product_title || i.title,
      quantity: Number(i.quantity),
    })),
    shipping_method: method?.name ?? null,
    // "easyship" → a label can be bought here; anything else → type in a tracking number.
    auto_label: provider?.startsWith("easyship") ?? false,
    payment,
    total: Number(order.summary?.current_order_total ?? order.total ?? 0),
    currency: order.currency_code,
    missing,
    can_fulfill: pending.length > 0 && missing.length === 0 && payment !== "unpaid",
    block_reason:
      pending.length === 0
        ? null
        : missing.length
          ? `Missing ${missing.join(", ")} — ask the customer`
          : payment === "unpaid"
            ? "Payment not completed yet"
            : null,
    fulfillments: active.map((f: any) => ({
      id: f.id,
      shipped_at: f.shipped_at ?? null,
      delivered_at: f.delivered_at ?? null,
      labels: (f.labels ?? [])
        .filter((l: any) => l)
        .map((l: any) => ({
          tracking_number: l.tracking_number ?? null,
          tracking_url: l.tracking_url ?? null,
          label_url: l.label_url ?? null,
        })),
    })),
  }
}

/**
 * Medusa only fills `quantity` and `total` when the totals fields above are
 * selected; the order-item `detail` row is the source of truth for quantity.
 * Normalising here means the stage logic never sees a null quantity (which
 * would silently read as "nothing left to pack").
 */
export function normalizeOrder(order: any) {
  if (!order) return order
  for (const i of order.items ?? []) {
    i.quantity = Number(i.detail?.quantity ?? i.quantity ?? 0)
  }
  return order
}

export async function loadOrder(container: MedusaContainer, id: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [order],
  } = await query.graph({ entity: "order", fields: ORDER_FIELDS, filters: { id } })
  return normalizeOrder(order) as any
}
