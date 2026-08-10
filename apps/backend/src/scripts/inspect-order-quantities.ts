import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Read-only. Medusa derives an order's fulfillment badge from per-item
 * quantities, not from a stored string. This prints them so we can see exactly
 * what the admin dashboard will render.
 *
 * Usage: npx medusa exec ./src/scripts/inspect-order-quantities.ts <order_id>
 */
export default async function inspectOrderQuantities({ container, args }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderId = args[0]

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "items.id",
      "items.title",
      "items.detail.quantity",
      "items.detail.fulfilled_quantity",
      "items.detail.shipped_quantity",
      "items.detail.delivered_quantity",
    ],
    ...(orderId ? { filters: { id: orderId } } : {}),
  })

  for (const o of orders as any[]) {
    console.log(`\n=== ORDER #${o.display_id} (${o.id}) status=${o.status} ===`)
    for (const i of o.items ?? []) {
      const d = i.detail ?? {}
      console.log(
        `  ${String(i.title).slice(0, 40).padEnd(42)} ordered=${d.quantity} fulfilled=${
          d.fulfilled_quantity
        } shipped=${d.shipped_quantity} delivered=${d.delivered_quantity}`
      )
    }
    const items = o.items ?? []
    const total = items.reduce((s: number, i: any) => s + (i.detail?.quantity ?? 0), 0)
    const delivered = items.reduce(
      (s: number, i: any) => s + (i.detail?.delivered_quantity ?? 0),
      0
    )
    const shipped = items.reduce(
      (s: number, i: any) => s + (i.detail?.shipped_quantity ?? 0),
      0
    )
    console.log(
      `  -> ADMIN BADGE would be: ${
        delivered >= total && total > 0
          ? "Delivered"
          : shipped >= total && total > 0
          ? "Shipped"
          : shipped > 0
          ? "Partially shipped"
          : "Not fulfilled / Fulfilled"
      }`
    )
  }
}
