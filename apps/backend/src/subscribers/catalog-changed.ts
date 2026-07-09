import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { revalidateStorefront } from "../utils/revalidate-storefront"

/**
 * Any catalog change made in the admin (products, categories, collections)
 * invalidates the storefront cache, so shoppers see the change immediately
 * instead of a stale cached page.
 */
export default async function catalogChangedHandler(
  _args: SubscriberArgs<unknown>
) {
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
