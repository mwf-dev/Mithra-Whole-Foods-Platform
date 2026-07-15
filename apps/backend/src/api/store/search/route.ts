import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { getMeiliClient, SEARCH_INDEX } from "../../../lib/meilisearch"

/**
 * Typo-tolerant product search backed by Meilisearch.
 * GET /store/search?q=…&limit=…&offset=…
 *
 * Returns ranked product ids (by relevance) plus a total count. The storefront
 * hydrates those ids through the normal product/pricing pipeline, so search
 * ranking stays in Meilisearch while prices/region stay authoritative in Medusa.
 *
 * Degrades gracefully: with no MEILISEARCH_HOST (or on error) it returns an
 * empty result rather than throwing, so search never takes the store down.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const q = ((req.query.q as string) ?? "").trim()
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? "12", 10) || 12,
    50
  )
  const offset = parseInt((req.query.offset as string) ?? "0", 10) || 0

  const meili = getMeiliClient()
  if (!meili || !q) {
    return res.json({ product_ids: [], count: 0 })
  }

  try {
    const result = await meili.index(SEARCH_INDEX).search(q, {
      limit,
      offset,
      attributesToRetrieve: ["id"],
    })

    return res.json({
      product_ids: result.hits.map((h: any) => h.id),
      count: result.estimatedTotalHits ?? result.hits.length,
    })
  } catch (e) {
    console.warn("[store/search] query failed", e)
    return res.json({ product_ids: [], count: 0 })
  }
}
