import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { removeOrphanedCartItems } from "../utils/cart-cleanup"

/**
 * Manual ops run (npx medusa exec ./src/scripts/cleanup-orphan-cart-items.ts).
 * The catalog-changed subscriber does this automatically on product/variant
 * deletion; this script exists for one-off repairs of historical data.
 */
export default async function cleanupOrphanCartItems({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const removed = await removeOrphanedCartItems(container)
  if (removed === 0) {
    logger.info("No orphaned line items found.")
  }
}
