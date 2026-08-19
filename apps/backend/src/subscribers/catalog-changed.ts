import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  revalidateStorefront,
  revalidateStorefrontTags,
} from "../utils/revalidate-storefront"
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

  // Tags first: these reach the product detail pages, which the path-based
  // purge below does not (they live behind a dynamic nested route, and their
  // fetch entry is separate from the listing's). This is what makes an edited
  // product's new images actually appear on its own page.
  await revalidateStorefrontTags([
    "products",
    "categories",
    "collections",
    "variants",
  ])

  // Still purge the rendered "/" tree — the homepage CMS composes catalog data
  // into its own route cache, which no fetch tag covers.
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
