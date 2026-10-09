import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildStats, toStatOrder } from "../../../lib/dashboard-stats"
import { loadProducts, toCard } from "../catalog-manager/_shared"

const FIELDS = [
  "id",
  "created_at",
  "canceled_at",
  "summary.current_order_total",
  "items.id",
  "items.title",
  "items.product_title",
  "items.unit_price",
  "items.quantity",
  "items.detail.quantity",
  "shipping_methods.amount",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
  "fulfillments.id",
  "fulfillments.packed_at",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "fulfillments.items.line_item_id",
  "fulfillments.items.quantity",
]

/**
 * GET /admin/dashboard-stats?days=30 (7–90)
 *
 * One call feeds every Dashboard chart: daily sales/orders, totals with change
 * vs the previous period, best sellers, the order pipeline, payment mix and
 * low-stock products. Aggregated in memory — at this shop's volume that is a
 * few hundred small rows.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const days = Math.min(Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 7), 90)
  const since = new Date(Date.now() - (days * 2 + 1) * 86_400_000)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: FIELDS,
    filters: { created_at: { $gte: since } } as any,
    pagination: { take: 2000, order: { created_at: "DESC" } },
  })

  const stats = buildStats((data as any[]).map(toStatOrder), days)

  const cards = (await loadProducts(req.scope)).map(toCard)
  const low_stock = cards
    // Only products on sale — "Coming soon" items have no price and no stock by design.
    .filter((p) => p.visible && p.price && p.stock !== null && p.stock <= 10)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 8)
    .map((p) => ({ id: p.id, title: p.title, stock: p.stock }))

  res.json({ ...stats, low_stock, catalog: { live: cards.filter((p) => p.visible).length, hidden: cards.filter((p) => !p.visible).length } })
}
