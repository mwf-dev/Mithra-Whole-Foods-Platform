import { MedusaContainer } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

/**
 * Make the whole catalog purchasable pre-launch.
 *   run: cd apps/backend && npx medusa exec ./src/scripts/enable-backorder.ts
 *
 * Inventory levels aren't set up yet, so every variant reads as "Out of stock"
 * and the PDP add-to-cart is disabled. Enabling backorder lets shoppers order
 * regardless of tracked stock. Reversible: once real inventory is managed in
 * admin, set allow_backorder back to false (or leave it for made-to-order).
 */
export default async function enableBackorder({
  container,
}: {
  container: MedusaContainer
}) {
  const productModule = container.resolve(Modules.PRODUCT)

  const variants = await productModule.listProductVariants(
    {},
    { select: ["id"], take: null }
  )

  await productModule.updateProductVariants(
    {},
    { allow_backorder: true }
  )

  console.log(`[enable-backorder] enabled backorder on ${variants.length} variants.`)
}
