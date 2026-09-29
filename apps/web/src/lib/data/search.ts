"use server"

import { sdk } from "@lib/config"
import { reportError } from "@lib/observability/report"

/**
 * Query the store search endpoint for ranked product ids.
 *
 * Backed by the in-process engine at `apps/backend/src/lib/product-search.ts` —
 * typo-tolerant, field-weighted, with curated synonym groups. (Meilisearch was
 * removed in `e0e2847`; this docstring used to say otherwise.)
 *
 * Returns ids in relevance order plus a total count. Fails soft (empty result)
 * so the search page never errors if search is unavailable — but the failure is
 * reported, because "search silently returns nothing" is indistinguishable from
 * "we don't stock that" to both the shopper and to anyone reading the
 * zero-results report.
 */
export const searchProductIds = async ({
  q,
  limit = 12,
  offset = 0,
}: {
  q: string
  limit?: number
  offset?: number
}): Promise<{ productIds: string[]; count: number }> => {
  if (!q?.trim()) {
    return { productIds: [], count: 0 }
  }

  try {
    const { product_ids, count } = await sdk.client.fetch<{
      product_ids: string[]
      count: number
    }>(`/store/search`, {
      method: "GET",
      query: { q, limit, offset },
    })

    return { productIds: product_ids ?? [], count: count ?? 0 }
  } catch (e) {
    reportError(e, {
      scope: "lib/data/search.searchProductIds",
      level: "warning",
      extra: { queryLength: q.length },
    })
    return { productIds: [], count: 0 }
  }
}
