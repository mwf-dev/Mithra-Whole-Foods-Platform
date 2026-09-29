import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * One-off repair (run: npx medusa exec ./src/scripts/fix-sales-channel-stock-links.ts)
 *
 * Historical duplicate seed runs left sales channels that are not linked to
 * any stock location, which makes add-to-cart fail with:
 *   "Sales channel <id> is not associated with any stock location"
 * Links every sales channel to every stock location (idempotent).
 */
export default async function fixSalesChannelStockLinks({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "stock_locations.id"],
  })
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })

  if (!locations.length) {
    logger.error("No stock locations exist — nothing to link.")
    return
  }

  for (const channel of channels) {
    const linked = new Set(
      (channel.stock_locations ?? []).map((l: any) => l?.id).filter(Boolean)
    )
    const missing = locations.filter((l) => !linked.has(l.id))
    if (!missing.length) {
      logger.info(`Channel "${channel.name}" (${channel.id}) already linked.`)
      continue
    }
    for (const loc of missing) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: loc.id, add: [channel.id] },
      })
      logger.info(
        `Linked channel "${channel.name}" (${channel.id}) -> location "${loc.name}" (${loc.id})`
      )
    }
  }

  // Inventory items with no inventory level at any location are unsellable
  // ("not associated with any stock location for variant ..."). Give them a
  // level at the first location with a starting quantity.
  const { data: items } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.id"],
  })
  const missingLevels = items.filter(
    (i: any) => !(i.location_levels ?? []).filter(Boolean).length
  )
  if (missingLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missingLevels.map((i: any) => ({
          inventory_item_id: i.id,
          location_id: locations[0].id,
          stocked_quantity: 100,
        })),
      },
    })
    logger.info(
      `Created inventory levels (qty 100 @ ${locations[0].name}) for: ` +
        missingLevels.map((i: any) => i.sku ?? i.id).join(", ")
    )
  } else {
    logger.info("All inventory items already have levels.")
  }

  logger.info("Sales-channel ↔ stock-location links repaired.")
}
