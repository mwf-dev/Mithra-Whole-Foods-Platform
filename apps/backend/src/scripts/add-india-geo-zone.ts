import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
} from "@medusajs/framework/utils"

/**
 * One-off repair (run: npx medusa exec ./src/scripts/add-india-geo-zone.ts)
 *
 * The only service zone covers EU/UK countries but not India, so an Indian
 * shipping address gets zero shipping options and checkout dead-ends at the
 * delivery step. Adds an "in" geo zone to every service zone that lacks it.
 */
export default async function addIndiaGeoZone({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fulfillment = container.resolve(ModuleRegistrationName.FULFILLMENT)

  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name", "geo_zones.country_code"],
  })

  for (const zone of zones) {
    const codes = (zone.geo_zones ?? [])
      .filter(Boolean)
      .map((g: any) => g.country_code)
    if (codes.includes("in")) {
      logger.info(`Zone ${zone.id} already covers India.`)
      continue
    }
    await fulfillment.createGeoZones([
      {
        type: "country",
        country_code: "in",
        service_zone_id: zone.id,
      },
    ])
    logger.info(`Added India geo zone to ${zone.id} (had: ${codes.join(", ")})`)
  }
}
