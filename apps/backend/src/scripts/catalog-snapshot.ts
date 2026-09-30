import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as fs from "fs/promises"

/**
 * Read-only: writes the whole catalog (every status) to a JSON file — products
 * with categories, tags, images, sales channels and variant prices, plus the
 * categories, tags, sales channels and shipping profiles. Use it as a backup
 * before bulk catalog edits and as the input for planning them.
 *
 *   cd apps/backend && CATALOG_SNAPSHOT=/tmp/catalog.json \
 *     NODE_ENV=development npx medusa exec ./src/scripts/catalog-snapshot.ts
 */
export default async function catalogSnapshot({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const out = process.env.CATALOG_SNAPSHOT || "catalog-snapshot.json"

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "subtitle",
      "description",
      "thumbnail",
      "created_at",
      "images.id",
      "images.url",
      "images.rank",
      "categories.id",
      "categories.handle",
      "tags.id",
      "tags.value",
      "sales_channels.id",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.manage_inventory",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
  })
  const [categories, tags, channels, profiles] = await Promise.all(
    ["product_category", "product_tag", "sales_channel", "shipping_profile"].map(
      (entity) =>
        query
          .graph({
            entity,
            fields:
              entity === "product_category"
                ? ["id", "name", "handle", "parent_category_id"]
                : entity === "product_tag"
                ? ["id", "value"]
                : ["id", "name"],
          })
          .then((r) => r.data)
    )
  )

  await fs.writeFile(
    out,
    JSON.stringify({ taken_at: new Date().toISOString(), products, categories, tags, channels, profiles }, null, 2)
  )
  logger.info(`[snapshot] ${products.length} products, ${categories.length} categories → ${out}`)
}
