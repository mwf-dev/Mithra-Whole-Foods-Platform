import { MedusaContainer } from "@medusajs/framework"

import { reindexAllProducts } from "../utils/search-sync"
import { getMeiliClient } from "../lib/meilisearch"

/**
 * Rebuild the Meilisearch product index from scratch.
 *   run: cd apps/backend && npx medusa exec ./src/scripts/reindex-search.ts
 *
 * No-op (with a warning) when MEILISEARCH_HOST isn't configured, so it's safe
 * to run in any environment.
 */
export default async function reindexSearch({
  container,
}: {
  container: MedusaContainer
}) {
  if (!getMeiliClient()) {
    console.warn(
      "[reindex-search] MEILISEARCH_HOST not set — skipping. Configure it to enable search."
    )
    return
  }

  const count = await reindexAllProducts(container)
  console.log(`[reindex-search] indexed ${count} published products.`)
}
