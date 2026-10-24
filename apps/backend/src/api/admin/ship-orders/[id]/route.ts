import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadOrder, providerByOption, toRow } from "../_shared"

/** GET /admin/ship-orders/:id — one order in the same shape the Ship orders page uses. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })
  res.json({ order: toRow(order, await providerByOption(req.scope, [order])) })
}
