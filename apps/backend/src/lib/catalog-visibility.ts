/**
 * The one rule that decides whether a product may be sold: it must be
 * `published`. Draft (hidden) products are filtered out by Medusa's store API
 * already; this module covers the places that API can't — carts that were
 * filled *before* a product was hidden, and order completion.
 */
export const isSellable = (product: { status?: string | null } | null | undefined): boolean =>
  product?.status === "published"

export type CartItemWithProduct = {
  id: string
  title?: string | null
  variant_id?: string | null
}

/**
 * Cart line items that can no longer be bought: the variant is gone, or its
 * product is not published. `statusByVariant` maps variant id → product status
 * for every variant that still exists.
 */
export function unsellableItems<T extends CartItemWithProduct>(
  items: (T | null | undefined)[],
  statusByVariant: Map<string, string | null | undefined>
): T[] {
  return items.filter((i): i is T => {
    if (!i) return false
    if (!i.variant_id) return true
    return !isSellable({ status: statusByVariant.get(i.variant_id) })
  })
}
