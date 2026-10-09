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

/** Every product id nested under `products` in a categories response. */
export function productIdsInCategoryBody(body: any): string[] {
  const cats: any[] = Array.isArray(body?.product_categories)
    ? body.product_categories
    : body?.product_category
      ? [body.product_category]
      : []
  const ids = new Set<string>()
  const walk = (c: any) => {
    for (const p of c?.products ?? []) if (p?.id) ids.add(p.id)
    for (const child of c?.category_children ?? []) walk(child)
    if (c?.parent_category) walk(c.parent_category)
  }
  cats.forEach(walk)
  return [...ids]
}

/**
 * Removes products that aren't in `sellableIds` from every `products` array in
 * a categories response (including nested children/parents). Medusa's category
 * relation expansion (`fields=*products`) returns draft products too, which
 * would leak a hidden product's name, handle and images to anyone holding the
 * public publishable key.
 */
export function stripUnsellableFromCategoryBody<T>(body: T, sellableIds: Set<string>): T {
  const clean = (c: any): any => {
    if (!c || typeof c !== "object") return c
    const out = { ...c }
    if (Array.isArray(c.products)) out.products = c.products.filter((p: any) => sellableIds.has(p?.id))
    if (Array.isArray(c.category_children)) out.category_children = c.category_children.map(clean)
    if (c.parent_category) out.parent_category = clean(c.parent_category)
    return out
  }
  const b: any = body
  if (Array.isArray(b?.product_categories)) return { ...b, product_categories: b.product_categories.map(clean) }
  if (b?.product_category) return { ...b, product_category: clean(b.product_category) }
  return body
}
