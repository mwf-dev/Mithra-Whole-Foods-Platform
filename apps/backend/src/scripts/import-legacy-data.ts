import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createInventoryLevelsWorkflow
} from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

export default async function import_legacy_data({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(ModuleRegistrationName.FILE)

  logger.info("Loading legacy data...")
  const dataPath = path.join(process.cwd(), "src/scripts/legacy_data.json")
  const rawData = await fs.readFile(dataPath, "utf-8")
  const legacyProducts = JSON.parse(rawData)

  // 1. Get Default Sales Channel
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { name: "Default Sales Channel" },
  })
  const defaultSalesChannelId = salesChannels[0]?.id
  if (!defaultSalesChannelId) throw new Error("Default Sales Channel not found")

  // 2. Get Shipping Profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const defaultShippingProfileId = shippingProfiles[0]?.id
  if (!defaultShippingProfileId) throw new Error("Shipping profile not found")

  // 3. Get Stock Location
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const defaultStockLocationId = stockLocations[0]?.id

  // 4. Create missing categories
  const uniqueCategories = new Set<string>()
  for (const p of legacyProducts) {
    if (p.categories && p.categories.length) {
      uniqueCategories.add(p.categories[0])
    }
  }

  const { data: existingCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })

  const existingCategoryNames = new Set(existingCategories.map((c: any) => c.name))
  const categoriesToCreate = Array.from(uniqueCategories)
    .filter((name) => !existingCategoryNames.has(name))
    .map((name) => ({ name, is_active: true }))

  if (categoriesToCreate.length > 0) {
    logger.info(`Creating ${categoriesToCreate.length} new categories...`)
    await createProductCategoriesWorkflow(container).run({
      input: { product_categories: categoriesToCreate },
    })
  }

  // Refetch categories to map by name
  const { data: allCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const categoryMap = new Map(allCategories.map((c: any) => [c.name, c.id]))

  logger.info(`Importing ${legacyProducts.length} products...`)

  for (const legacyProduct of legacyProducts) {
    try {
      logger.info(`Processing: ${legacyProduct.title}`)

      // Download and upload image
      let uploadedImageUrl = ""
      if (legacyProduct.imageUrl) {
        try {
          const res = await fetch(legacyProduct.imageUrl)
          const buffer = await res.arrayBuffer()
          const filename = legacyProduct.imageUrl.split("/").pop() || "image.jpg"
          
          // Medusa v2 createFiles signature
          const uploaded = await fileService.createFiles([
            {
              filename,
              mimeType: res.headers.get("content-type") || "image/jpeg",
              content: Buffer.from(buffer).toString("base64"),
              access: "public",
            },
          ])
          
          if (uploaded && uploaded.length > 0) {
            uploadedImageUrl = uploaded[0].url
          }
        } catch (e: any) {
          logger.warn(`Failed to upload image for ${legacyProduct.title}: ${e.message}`)
        }
      }

      const categoryId = categoryMap.get(legacyProduct.categories?.[0])

      // Generate a clean handle
      const handle = legacyProduct.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")

      const productPayload = {
        title: legacyProduct.title,
        handle,
        description: legacyProduct.description || "",
        status: ProductStatus.PUBLISHED,
        shipping_profile_id: defaultShippingProfileId,
        sales_channels: [{ id: defaultSalesChannelId }],
        images: uploadedImageUrl ? [{ url: uploadedImageUrl }] : [],
        category_ids: categoryId ? [categoryId] : [],
        options: [{ title: "Default Option", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: handle,
            options: { "Default Option": "Default" },
            prices: [
              {
                amount: legacyProduct.price,
                currency_code: "usd",
              },
            ],
          },
        ],
      }

      const { result } = await createProductsWorkflow(container).run({
        input: { products: [productPayload] },
      })

      // Add inventory
      if (defaultStockLocationId && result && result.length > 0) {
        const createdProduct = result[0]
        
        // Refetch to get inventory item IDs
        const { data: variants } = await query.graph({
          entity: "product_variant",
          fields: ["id", "inventory_items.*"],
          filters: { product_id: createdProduct.id },
        })

        const inventoryLevels = []
        for (const variant of variants) {
          for (const item of variant.inventory_items || []) {
            inventoryLevels.push({
              location_id: defaultStockLocationId,
              stocked_quantity: 100,
              inventory_item_id: item.inventory_item_id, // in v2 graph it's item.inventory_item_id or item.inventory.id?
            })
          }
        }

        if (inventoryLevels.length > 0) {
          // Fix for varying graph structures
          const levels = inventoryLevels.map(l => ({
             location_id: l.location_id,
             stocked_quantity: l.stocked_quantity,
             inventory_item_id: l.inventory_item_id
          }))
          
          await createInventoryLevelsWorkflow(container).run({
            input: { inventory_levels: levels },
          })
        }
      }
    } catch (err: any) {
      logger.error(`Failed to import ${legacyProduct.title}: ${err.message}`)
    }
  }

  logger.info("Finished importing legacy data!")
}
