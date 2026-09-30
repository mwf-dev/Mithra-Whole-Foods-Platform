import { HttpTypes } from "@medusajs/types"

/** Tag an admin adds to a product to announce it before it can be bought. */
export const COMING_SOON_TAG = "coming-soon"

/**
 * A product is "coming soon" when it is tagged so, or when none of its
 * variants has a price in the current region. The second case matters: Medusa
 * rejects a line item for an unpriced variant, so without this the button
 * would offer "Add to cart" and then fail. New products are created unpriced
 * and tagged; they switch on the moment the client sets a price in the admin
 * (and removes the tag).
 */
export function isComingSoon(product: HttpTypes.StoreProduct): boolean {
  const tagged = !!product.tags?.some(
    (t) => t.value?.toLowerCase() === COMING_SOON_TAG
  )
  const priced = !!product.variants?.some(
    (v: any) => v?.calculated_price?.calculated_amount != null
  )
  return tagged || !priced
}
