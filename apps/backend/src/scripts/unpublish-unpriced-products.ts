import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Takes the two INR-only seed products off the storefront.
 *
 * Why `status: "draft"` and not a delete: both are referenced by real order
 * line items (3 of them), so a hard delete would orphan order history — which
 * is why the admin UI refuses. Draft is what the admin's own "delete" would
 * have had to do anyway, it is reversible, and `/store/products` only returns
 * published products, so the storefront effect is identical.
 *
 * They are also pinned to the "Homepage - Best Sellers" collection, which is
 * how they ended up first in every best-seller row; that link is dropped too so
 * the row is not left a slot short if they are ever republished with a price.
 *
 * Idempotent — safe to re-run.
 *
 * Run: cd apps/backend && npx medusa exec ./src/scripts/unpublish-unpriced-products.ts
 */
export default async function unpublishUnpricedProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const productModule = container.resolve(Modules.PRODUCT)

  const HANDLES = ["wood-pressed-groundnut-oil", "organic-turmeric-powder"]

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "collection_id"],
    filters: { handle: HANDLES },
  })

  if (!products.length) {
    logger.info("Nothing matched those handles — already gone.")
    return
  }

  for (const p of products as any[]) {
    if (p.status === "draft" && p.collection_id === null) {
      logger.info(`• ${p.title} — already draft and uncollected, skipping`)
      continue
    }

    await productModule.updateProducts(p.id, {
      status: "draft",
      collection_id: null,
    })

    logger.info(
      `• ${p.title}: status ${p.status} -> draft, collection ${p.collection_id ?? "-"} -> none`
    )
  }

  const { data: after } = await query.graph({
    entity: "product",
    fields: ["title", "status", "collection_id"],
    filters: { handle: HANDLES },
  })

  logger.info("\nAfter:")
  for (const p of after as any[]) {
    logger.info(`  ${p.title} — status=${p.status} collection=${p.collection_id ?? "none"}`)
  }

  // Confirm the storefront-visible catalogue is what we expect afterwards.
  const { data: published } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { status: "published" },
  })
  logger.info(`\nPublished products now visible to the storefront: ${published.length}`)
}
