import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefront } from "../utils/revalidate-storefront"
import { removeOrphanedCartItems } from "../utils/cart-cleanup"
import { indexProduct, removeProduct } from "../utils/search-sync"

const DELETION_EVENTS = new Set([
  "product.deleted",
  "product-variant.deleted",
])

/**
 * Any catalog change made in the admin (products, categories, collections)
 * invalidates the storefront cache, so shoppers see the change immediately
 * instead of a stale cached page.
 *
 * Deletions additionally scrub the removed variants out of open carts —
 * otherwise those carts fail transfer/checkout with 400s forever.
 */
export default async function catalogChangedHandler({
  event,
  container,
}: SubscriberArgs<unknown>) {
  if (DELETION_EVENTS.has(event.name)) {
    try {
      await removeOrphanedCartItems(container)
    } catch (e) {
      console.warn("[catalog-changed] orphaned cart item cleanup failed", e)
    }
  }

  // Keep the Meilisearch product index in sync with catalog changes. Best
  // effort — never let a search-sync failure break the admin operation.
  try {
    const { id } = (event.data ?? {}) as { id?: string }
    if (id) {
      if (event.name === "product.deleted") {
        await removeProduct(id)
      } else if (
        event.name === "product.created" ||
        event.name === "product.updated"
      ) {
        await indexProduct(container, id)
      }
    }
  } catch (e) {
    console.warn("[catalog-changed] search index sync failed", e)
  }

  await revalidateStorefront("/", "layout")
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
  ],
}
