"use server"

import { sdk } from "@lib/config"

/**
 * Query the Meilisearch-backed store search endpoint for ranked product ids.
 * Returns ids in relevance order plus a total count. Fails soft (empty result)
 * so the search page never errors if search is unavailable.
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
    return { productIds: [], count: 0 }
  }
}
