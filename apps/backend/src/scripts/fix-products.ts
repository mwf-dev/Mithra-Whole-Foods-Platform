import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, ModuleRegistrationName } from "@medusajs/framework/utils"
import { updateProductsWorkflow, updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

export default async function fixProducts({ container }: { container: MedusaContainer }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService = container.resolve(ModuleRegistrationName.FILE)
  
  logger.info("Starting product fix script...")

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", 
      "title", 
      "description", 
      "thumbnail", 
      "images.*",
      "variants.*",
      "variants.prices.*"
    ],
  })

  logger.info(`Found ${products.length} products to fix.`)

  for (const product of products) {
    try {
      const updates: any = { id: product.id }
      let needsProductUpdate = false

      // 1. Fix Description (Strip HTML)
      if (product.description && product.description.includes("<")) {
        updates.description = product.description.replace(/<[^>]*>?/gm, "").trim()
        needsProductUpdate = true
      }

      // 2. Fix Images (Rename file on disk if it has %20, update DB URL)
      // The issue: URL is http://.../static/file%20name.jpg
      // But the file on disk literally contains %20 in the name!
      // We will rename the file on disk to replace %20 with spaces.
      let newImages = product.images?.map((img: any) => ({ id: img.id, url: img.url }))
      let needsImageUpdate = false
      
      const fixUrl = async (url: string) => {
        if (url && url.includes("%20")) {
          const filename = url.split("/").pop()
          if (filename) {
            const decodedName = decodeURIComponent(filename)
            const staticDir = path.join(process.cwd(), "static")
            try {
              // Rename the file on disk from literal %20 to a space
              await fs.rename(path.join(staticDir, filename), path.join(staticDir, decodedName))
              // The DB URL should still have %20 (since it's a URL), but actually the URL in DB is fine,
              // we don't need to update the DB if we just fix the file name on disk!
              // BUT wait! Medusa stores the URL exactly as given. Next.js image might still fetch it.
              // If we rename it on disk to have spaces, Express static will serve it when a URL with %20 is requested!
              // So we don't even need to update the DB URL, just rename the file on disk!
            } catch (e: any) {
              // Ignore if already renamed
            }
          }
        }
      }

      if (product.thumbnail) {
        await fixUrl(product.thumbnail)
      }
      for (const img of product.images || []) {
        await fixUrl(img.url)
      }

      if (needsProductUpdate) {
        await updateProductsWorkflow(container).run({
          input: { products: [updates] }
        })
        logger.info(`Updated product: ${product.title}`)
      }

      // 3. Fix Prices
      for (const variant of product.variants || []) {
        const prices = variant.prices || []
        const usdPrice = prices.find((p: any) => p.currency_code === "usd")
        const inrPrice = prices.find((p: any) => p.currency_code === "inr")

        if (usdPrice && !inrPrice) {
          // Add INR price (USD * 83)
          const inrAmount = Math.round(usdPrice.amount * 83)
          await updateProductVariantsWorkflow(container).run({
            input: {
              product_variants: [
                {
                  id: variant.id,
                  prices: [
                    ...prices.map((p:any) => ({ id: p.id, amount: p.amount, currency_code: p.currency_code })),
                    { amount: inrAmount, currency_code: "inr" }
                  ]
                }
              ]
            }
          })
          logger.info(`Added INR price ${inrAmount} to variant ${variant.id} of ${product.title}`)
        }
      }
    } catch (e: any) {
      logger.error(`Failed to fix ${product.title}: ${e.message}`)
    }
  }

  logger.info("Done fixing products!")
}
