import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { unsellableItems } from "../lib/catalog-visibility"

/**
 * Removes line items from open (non-completed) carts that can no longer be
 * bought: the variant no longer exists (product deleted) or its product has
 * been hidden (status no longer "published"). Orphaned items break cart
 * transfer and checkout with 400s until removed, and a hidden product must not
 * stay purchasable just because it was in a basket already.
 *
 * Returns the number of removed line items.
 */
export async function removeOrphanedCartItems(
  container: MedusaContainer
): Promise<number> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const cartModule = container.resolve(Modules.CART)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "completed_at", "items.id", "items.title", "items.variant_id"],
    filters: { completed_at: null },
  })

  const openCarts = carts.filter((c: any) => !c.completed_at)
  const variantIds = new Set<string>()
  for (const c of openCarts) {
    for (const item of c.items ?? []) {
      if (item?.variant_id) {
        variantIds.add(item.variant_id)
      }
    }
  }

  const statusByVariant = new Map<string, string | null | undefined>()
  if (variantIds.size > 0) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product.status"],
      filters: { id: Array.from(variantIds) },
    })
    for (const v of variants as any[]) {
      statusByVariant.set(v.id, v.product?.status)
    }
  }

  const orphanItemIds: string[] = []
  for (const c of openCarts) {
    for (const item of unsellableItems(c.items ?? [], statusByVariant)) {
      orphanItemIds.push(item.id)
      logger.info(
        `[cart-cleanup] removing unavailable item "${item.title}" (${item.id}) from ${c.id}`
      )
    }
  }

  if (orphanItemIds.length > 0) {
    await cartModule.deleteLineItems(orphanItemIds)
    logger.info(`[cart-cleanup] removed ${orphanItemIds.length} orphaned line item(s)`)
  }

  return orphanItemIds.length
}
