import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { searchProducts } from "../../../lib/product-search"

/**
 * Typo-tolerant, synonym-aware product search — computed in-process, no
 * external search service.
 * GET /store/search?q=…&limit=…&offset=…
 *
 * Returns relevance-ranked product ids plus a total count. The storefront
 * hydrates those ids through the normal product/pricing pipeline, so ranking
 * lives here while prices/region stay authoritative in Medusa.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = ((req.query.q as string) ?? "").trim()
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? "12", 10) || 12,
    50
  )
  const offset = parseInt((req.query.offset as string) ?? "0", 10) || 0

  if (!q) {
    return res.json({ product_ids: [], count: 0 })
  }

  try {
    const { ids, count } = await searchProducts(req.scope, { q, limit, offset })
    return res.json({ product_ids: ids, count })
  } catch (e) {
    console.warn("[store/search] query failed", e)
    return res.json({ product_ids: [], count: 0 })
  }
}
