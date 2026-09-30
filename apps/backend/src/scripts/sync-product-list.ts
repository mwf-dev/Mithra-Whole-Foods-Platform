import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductTagsWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Brings the catalog in line with a client product list (see
 * `data/client-product-list-*.json`). Additive and idempotent:
 *
 *   - `categories`: created if their handle is missing.
 *   - `create`: products whose handle is missing are created as **coming soon**
 *     — published, tagged `coming-soon`, one variant with **no price**, stock
 *     tracked at the default location with 0 on hand. They go on sale when
 *     the client sets a price in the admin and removes the tag.
 *   - `update`: the packshot is uploaded and put *first* in the product's
 *     images (existing images are kept after it, unless `replace_images`),
 *     and optional title/description/publish/coming-soon changes applied.
 *
 * Nothing is deleted or unpublished. Take a snapshot first
 * (`catalog-snapshot.ts`).
 *
 *   cd apps/backend && PLAN=src/scripts/data/client-product-list-2026-09-30.json \
 *     PACKSHOTS=/path/to/packshots DRY_RUN=1 \
 *     NODE_ENV=development npx medusa exec ./src/scripts/sync-product-list.ts
 *
 * Drop DRY_RUN to apply.
 */
type Plan = {
  sales_channel_id: string
  tag: string
  categories: { handle: string; name: string }[]
  create: {
    handle: string
    title: string
    category: string
    description: string
    image: string | null
  }[]
  update: {
    handle: string
    image: string
    replace_images?: boolean
    publish?: boolean
    coming_soon?: boolean
    title?: string
    description?: string
  }[]
}

export default async function syncProductList({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService: any = container.resolve(Modules.FILE)
  const dryRun = !!process.env.DRY_RUN
  const plan: Plan = JSON.parse(await fs.readFile(process.env.PLAN!, "utf-8"))
  const shots = process.env.PACKSHOTS!
  const log = (m: string) => logger.info(`[sync]${dryRun ? " (dry run)" : ""} ${m}`)

  const upload = async (file: string, handle: string) => {
    const buffer = await fs.readFile(path.join(shots, file))
    if (dryRun) return `dry-run://${file}`
    const [created] = await fileService.createFiles([
      {
        filename: `packshot-${handle}.jpg`,
        mimeType: "image/jpeg",
        content: buffer.toString("base64"),
        access: "public",
      },
    ])
    return created.url as string
  }

  // Lookups
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const catByHandle = new Map(categories.map((c: any) => [c.handle, c.id]))
  for (const cat of plan.categories) {
    if (catByHandle.has(cat.handle)) continue
    log(`create category ${cat.handle}`)
    if (!dryRun) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: {
          product_categories: [{ name: cat.name, handle: cat.handle, is_active: true }],
        },
      })
      catByHandle.set(cat.handle, result[0].id)
    }
  }

  const { data: tags } = await query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  let tagId = tags.find((t: any) => t.value === plan.tag)?.id as string | undefined
  if (!tagId) {
    log(`create tag ${plan.tag}`)
    if (!dryRun) {
      const { result } = await createProductTagsWorkflow(container).run({
        input: { product_tags: [{ value: plan.tag }] },
      })
      tagId = result[0].id
    }
  }

  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const { data: locations } = await query.graph({ entity: "stock_location", fields: ["id"] })
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "images.url", "tags.id"],
  })
  const byHandle = new Map(products.map((p: any) => [p.handle, p]))

  // Create
  for (const item of plan.create) {
    if (byHandle.has(item.handle)) {
      log(`skip create ${item.handle} (exists)`)
      continue
    }
    const categoryId = catByHandle.get(item.category)
    if (!categoryId && !dryRun) throw new Error(`Unknown category ${item.category}`)
    const url = item.image ? await upload(item.image, item.handle) : null
    log(`create ${item.handle} → ${item.category}${url ? "" : " (no image)"}`)
    if (dryRun) continue

    const { result } = await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: item.title,
            handle: item.handle,
            description: item.description,
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: profiles[0].id,
            sales_channels: [{ id: plan.sales_channel_id }],
            category_ids: [categoryId as string],
            tag_ids: tagId ? [tagId] : [],
            images: url ? [{ url }] : [],
            thumbnail: url ?? undefined,
            options: [{ title: "Default Option", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                sku: item.handle,
                options: { "Default Option": "Default" },
                manage_inventory: true,
                prices: [],
              },
            ],
          },
        ],
      },
    })

    if (locations[0]) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["inventory_items.inventory_item_id"],
        filters: { product_id: result[0].id },
      })
      const levels = variants.flatMap((v: any) =>
        (v.inventory_items ?? []).map((i: any) => ({
          location_id: locations[0].id,
          inventory_item_id: i.inventory_item_id,
          stocked_quantity: 0,
        }))
      )
      if (levels.length) {
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: levels },
        })
      }
    }
  }

  // Update
  for (const item of plan.update) {
    const product: any = byHandle.get(item.handle)
    if (!product) {
      logger.warn(`[sync] update target ${item.handle} not found — skipped`)
      continue
    }
    const existing: string[] = (product.images ?? []).map((i: any) => i.url)
    if (existing[0]?.includes(`packshot-${item.handle}`)) {
      log(`skip image ${item.handle} (packshot already first)`)
    }
    const needsImage = !existing[0]?.includes(`packshot-${item.handle}`)
    const url = needsImage ? await upload(item.image, item.handle) : existing[0]
    const images = item.replace_images
      ? [url]
      : [url, ...existing.filter((u) => u !== url)]

    const update: Record<string, unknown> = {
      images: images.map((u) => ({ url: u })),
      thumbnail: url,
    }
    if (item.title) update.title = item.title
    if (item.description) update.description = item.description
    if (item.publish) update.status = ProductStatus.PUBLISHED
    if (item.coming_soon && tagId) {
      update.tag_ids = [...new Set([...(product.tags ?? []).map((t: any) => t.id), tagId])]
    }
    log(
      `update ${item.handle}: ${Object.keys(update).join(", ")} (${images.length} image(s))`
    )
    if (dryRun) continue
    await updateProductsWorkflow(container).run({
      input: { selector: { id: product.id }, update },
    })
  }

  log("done")
}
