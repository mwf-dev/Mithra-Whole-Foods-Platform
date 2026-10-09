import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadProducts, toCard } from "./_shared"

/** GET /admin/catalog-manager — every product as a card, hidden ones included. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const products = await loadProducts(req.scope)
  res.json({ products: products.map(toCard) })
}
