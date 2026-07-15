import { Meilisearch } from "meilisearch"

export const SEARCH_INDEX = "products"

/**
 * Returns a Meilisearch client, or null when search isn't configured
 * (no MEILISEARCH_HOST). Callers must treat null as "search disabled" so the
 * app keeps working without the search service.
 */
let client: Meilisearch | null | undefined

export function getMeiliClient(): Meilisearch | null {
  if (client !== undefined) {
    return client
  }

  const host = process.env.MEILISEARCH_HOST
  const apiKey = process.env.MEILISEARCH_API_KEY

  client = host ? new Meilisearch({ host, apiKey }) : null
  return client
}

export type ProductSearchDoc = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  description: string
  categories: string[]
  category_ids: string[]
  tags: string[]
  created_at: number
}

/**
 * Ensures the products index exists with the right searchable/filterable/
 * sortable attributes. Safe to call repeatedly.
 */
export async function ensureProductIndex(meili: Meilisearch): Promise<void> {
  await meili.createIndex(SEARCH_INDEX, { primaryKey: "id" }).catch(() => {
    // index already exists — fine
  })

  const index = meili.index(SEARCH_INDEX)
  await index.updateSettings({
    searchableAttributes: ["title", "categories", "tags", "description"],
    filterableAttributes: ["category_ids"],
    sortableAttributes: ["created_at"],
    // Grocery terms are short (ghee, oil, dal, rice), so lower the word-length
    // thresholds at which typo tolerance kicks in (defaults are 5/9).
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 3, twoTypos: 7 },
    },
    rankingRules: [
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness",
    ],
  })
}
