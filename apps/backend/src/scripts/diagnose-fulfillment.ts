import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { MedusaContainer } from "@medusajs/framework"

/**
 * Read-only diagnostic: prints regions, stock locations, fulfillment sets +
 * service/geo zones, and shipping options so we can see why order fulfillment
 * / shipping may be failing. Run:
 *   npx medusa exec ./src/scripts/diagnose-fulfillment.ts
 */
export default async function diagnose({
  container,
}: {
  container: MedusaContainer
}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  console.log("\n=== REGIONS ===")
  for (const r of regions) {
    console.log(
      `- ${r.name} [${r.currency_code}] countries: ${(r.countries || [])
        .map((c: any) => c.iso_2)
        .join(", ")}`
    )
  }

  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "address.country_code", "address.city"],
  })
  console.log("\n=== STOCK LOCATIONS ===")
  for (const l of locations) {
    console.log(
      `- ${l.name} @ ${l.address?.city || "?"}, ${
        l.address?.country_code || "?"
      }`
    )
  }

  const { data: fsets } = await query.graph({
    entity: "fulfillment_set",
    fields: [
      "id",
      "name",
      "type",
      "service_zones.name",
      "service_zones.geo_zones.country_code",
      "service_zones.geo_zones.type",
    ],
  })
  console.log("\n=== FULFILLMENT SETS / SERVICE ZONES ===")
  for (const f of fsets) {
    console.log(`- ${f.name} (${f.type})`)
    for (const z of f.service_zones || []) {
      const geos = (z.geo_zones || [])
        .map((g: any) => `${g.type}:${g.country_code}`)
        .join(", ")
      console.log(`    zone "${z.name}" -> ${geos || "(no geo zones)"}`)
    }
  }

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "provider_id",
      "service_zone.name",
      "service_zone.geo_zones.country_code",
    ],
  })
  console.log("\n=== SHIPPING OPTIONS ===")
  for (const o of options) {
    const geos = (o.service_zone?.geo_zones || [])
      .map((g: any) => g.country_code)
      .join(", ")
    console.log(
      `- ${o.name} [provider: ${o.provider_id}] zone: ${
        o.service_zone?.name || "?"
      } (${geos || "no geo"})`
    )
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "payment_status",
      "fulfillment_status",
      "fulfillments.id",
      "fulfillments.packed_at",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "items.id",
    ],
    pagination: { take: 8, order: { display_id: "DESC" } },
  })
  console.log("\n=== RECENT ORDERS ===")
  for (const o of orders) {
    const fuls = (o.fulfillments || [])
      .map(
        (f: any) =>
          `ful#${f.id?.slice(-6)}${f.packed_at ? " packed" : ""}${
            f.shipped_at ? " shipped" : ""
          }${f.delivered_at ? " delivered" : ""}${
            f.canceled_at ? " CANCELED" : ""
          }`
      )
      .join(" | ")
    console.log(
      `- #${o.display_id} status:${o.status} pay:${o.payment_status} ful:${o.fulfillment_status} items:${
        (o.items || []).length
      } -> ${fuls || "(no fulfillments)"}`
    )
  }

  const orderModule: any = container.resolve(Modules.ORDER)
  const computed = await orderModule.listOrders(
    {},
    {
      select: ["id", "display_id", "status", "payment_status", "fulfillment_status"],
      take: 8,
      order: { display_id: "DESC" },
    }
  )
  console.log("\n=== COMPUTED ORDER STATUS (as admin shows) ===")
  for (const o of computed) {
    console.log(
      `- #${o.display_id} status:${o.status} pay:${o.payment_status} ful:${o.fulfillment_status}`
    )
  }

  console.log("\n=== DONE ===\n")
}
