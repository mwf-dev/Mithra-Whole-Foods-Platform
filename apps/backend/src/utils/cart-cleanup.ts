import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Removes line items from open (non-completed) carts whose variant no longer
 * exists — e.g. after products were deleted in the admin. Such orphaned items
 * break cart transfer and checkout with 400s until removed.
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

  let existing = new Set<string>()
  if (variantIds.size > 0) {
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id"],
      filters: { id: Array.from(variantIds) },
    })
    existing = new Set(variants.map((v: any) => v.id))
  }

  const orphanItemIds: string[] = []
  for (const c of openCarts) {
    for (const item of c.items ?? []) {
      if (!item) {
        continue
      }
      if (!item.variant_id || !existing.has(item.variant_id)) {
        orphanItemIds.push(item.id)
        logger.info(
          `[cart-cleanup] removing orphaned item "${item.title}" (${item.id}) from ${c.id}`
        )
      }
    }
  }

  if (orphanItemIds.length > 0) {
    await cartModule.deleteLineItems(orphanItemIds)
    logger.info(`[cart-cleanup] removed ${orphanItemIds.length} orphaned line item(s)`)
  }

  return orphanItemIds.length
}
