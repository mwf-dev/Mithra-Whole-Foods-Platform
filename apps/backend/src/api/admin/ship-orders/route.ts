import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_FIELDS, normalizeOrder, providerByOption, toRow } from "./_shared"

/**
 * GET /admin/ship-orders
 *
 * Orders from the last 90 days, newest first, each with the stage the packer
 * cares about (to ship → label ready → shipped → delivered). `/admin/*` is
 * behind Medusa's admin session, so no extra auth here.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000)

  const { data } = await query.graph({
    entity: "order",
    fields: ORDER_FIELDS,
    filters: { created_at: { $gte: since } } as any,
    pagination: { take: 150, order: { created_at: "DESC" } },
  })

  const orders = (data as any[]).map(normalizeOrder).filter((o) => !o.canceled_at)
  const providers = await providerByOption(req.scope, orders)
  res.json({ orders: orders.map((o) => toRow(o, providers)) })
}
