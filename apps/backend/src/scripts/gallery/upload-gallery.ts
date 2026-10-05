import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Puts the galleries built by `build_gallery.py` onto the catalog. For each
 * handle in the manifest the product's images are *replaced* by the new
 * gallery (front first, back last) and the thumbnail is set to the first.
 * Idempotent: a product whose first image is already `gallery-<handle>-01` is
 * skipped. Take a snapshot first (`../catalog-snapshot.ts`); the old image
 * URLs stay in Cloudinary, so a snapshot is enough to roll back.
 *
 *   cd apps/backend && GALLERY=/path/to/out DRY_RUN=1 \
 *     NODE_ENV=development npx medusa exec ./src/scripts/gallery/upload-gallery.ts
 *
 * Drop DRY_RUN to apply.
 */
export default async function uploadGallery({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService: any = container.resolve(Modules.FILE)
  const dryRun = !!process.env.DRY_RUN
  const dir = process.env.GALLERY!
  const manifest: Record<string, string[]> = JSON.parse(
    await fs.readFile(path.join(dir, "manifest.json"), "utf-8")
  )
  const log = (m: string) => logger.info(`[gallery]${dryRun ? " (dry run)" : ""} ${m}`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "images.url"],
  })
  const byHandle = new Map<string, any>(products.map((p: any) => [p.handle, p]))

  for (const [handle, files] of Object.entries(manifest)) {
    const product = byHandle.get(handle)
    if (!product) {
      logger.warn(`[gallery] ${handle} not in catalog — skipped`)
      continue
    }
    if (product.images?.[0]?.url?.includes(`gallery-${handle}-01`)) {
      log(`skip ${handle} (gallery already first)`)
      continue
    }
    const urls: string[] = []
    for (const [i, file] of files.entries()) {
      if (dryRun) {
        urls.push(`dry-run://${file}`)
        continue
      }
      const buffer = await fs.readFile(path.join(dir, handle, file))
      const [created] = await fileService.createFiles([
        {
          filename: `gallery-${handle}-${String(i + 1).padStart(2, "0")}.jpg`,
          mimeType: "image/jpeg",
          content: buffer.toString("base64"),
          access: "public",
        },
      ])
      urls.push(created.url)
    }
    log(`${handle}: ${product.images?.length ?? 0} old → ${urls.length} new image(s)`)
    if (dryRun) continue
    await updateProductsWorkflow(container).run({
      input: {
        selector: { id: product.id },
        update: { images: urls.map((url) => ({ url })), thumbnail: urls[0] },
      },
    })
  }
  log("done")
}
