import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework"

/**
 * One-off: rename the leftover "European Warehouse" (Copenhagen, DK) stock
 * location — a Medusa-starter default — to the real US warehouse.
 * Run: npx medusa exec ./src/scripts/rename-warehouse.ts
 * Adjust NAME/ADDRESS below or edit later in Admin → Settings → Locations.
 */
const NAME = "Mithra Whole Foods — Exton"
const ADDRESS = {
  address_1: "",
  city: "Exton",
  province: "PA",
  postal_code: "19341",
  country_code: "us",
}

export default async function renameWarehouse({
  container,
}: {
  container: MedusaContainer
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const stockLocation: any = container.resolve(Modules.STOCK_LOCATION)

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.city", "address.country_code"],
  })

  if (!locations.length) {
    console.log("No stock locations found.")
    return
  }

  for (const loc of locations) {
    console.log(
      `Before: ${loc.name} @ ${loc.address?.city || "?"}, ${
        loc.address?.country_code || "?"
      }`
    )
    await stockLocation.updateStockLocations(loc.id, {
      name: NAME,
      address: ADDRESS,
    })
  }

  const { data: after } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.city", "address.country_code"],
  })
  for (const loc of after) {
    console.log(
      `After:  ${loc.name} @ ${loc.address?.city || "?"}, ${
        loc.address?.country_code || "?"
      }`
    )
  }
}
