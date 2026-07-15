import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefront } from "../utils/revalidate-storefront"
import { removeOrphanedCartItems } from "../utils/cart-cleanup"
import { invalidateSearchIndex } from "../lib/product-search"

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

  // Drop the in-memory search index so the next search rebuilds from fresh
  // catalog data (products/categories/tags just changed).
  invalidateSearchIndex()

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
