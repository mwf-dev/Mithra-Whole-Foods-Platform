import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Puts the AI-generated card images (docs/CARD_IMAGES_PROMPT.md) at the front
 * of each product's gallery: image 1 is the white-background packshot (the card
 * default), image 2 is the pack on its ingredient (the card hover — see
 * `card-model.ts`). The product's existing images are kept, in order, behind
 * them, so nothing is lost and no old file is re-uploaded.
 *
 * Manifest: <dir>/manifest.json = { handle: ["01-packshot.jpg", "02-ingredient.jpg"] }
 * Idempotent: a product whose first image is already `card-<handle>-01` is skipped.
 * Take a snapshot first (`../catalog-snapshot.ts`) — old URLs stay valid, so a
 * snapshot is enough to roll back.
 *
 *   cd apps/backend && CARDS=/path/to/dir DRY_RUN=1 \
 *     NODE_ENV=development npx medusa exec ./src/scripts/gallery/upload-cards.ts
 *
 * Drop DRY_RUN to apply.
 *
 * PREFIX (default "card") names the uploaded files `<prefix>-<handle>-NN.jpg`.
 * REPLACE=<prefix> drops existing images from an earlier run with that prefix
 * instead of keeping them behind the new ones (used to redo the oil cards:
 * PREFIX=oil REPLACE=card). Files are uploaded under their manifest names'
 * numeric prefix, so REPLACE=all drops every existing image (used when the old
 * ones show another brand's pack). The manifest names' numeric prefix gives the
 * slot, so a manifest of ["01-packshot.jpg","02-…","03-back.jpg"]
 * becomes -01, -02, -03.
 */
export default async function uploadCards({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService: any = container.resolve(Modules.FILE)
  const dryRun = !!process.env.DRY_RUN
  const prefix = process.env.PREFIX || "card"
  const replace = process.env.REPLACE
  const dir = process.env.CARDS!
  const manifest: Record<string, string[]> = JSON.parse(
    await fs.readFile(path.join(dir, "manifest.json"), "utf-8")
  )
  const log = (m: string) => logger.info(`[cards]${dryRun ? " (dry run)" : ""} ${m}`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "images.url", "images.rank"],
  })
  const byHandle = new Map<string, any>(products.map((p: any) => [p.handle, p]))

  for (const [handle, files] of Object.entries(manifest)) {
    const product = byHandle.get(handle)
    if (!product) {
      logger.warn(`[cards] ${handle} not in catalog — skipped`)
      continue
    }
    const existing: string[] = [...(product.images ?? [])]
      .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((i: any) => i.url)
    if (existing[0]?.includes(`${prefix}-${handle}-01`)) {
      log(`skip ${handle} (${prefix} images already first)`)
      continue
    }
    const kept =
      replace === "all"
        ? []
        : replace
          ? existing.filter((u) => !u.includes(`${replace}-${handle}-`))
          : existing
    const fresh: string[] = []
    for (const file of files) {
      if (dryRun) {
        fresh.push(`dry-run://${file}`)
        continue
      }
      const buffer = await fs.readFile(path.join(dir, handle, file))
      const [created] = await fileService.createFiles([
        {
          filename: `${prefix}-${handle}-${file.slice(0, 2)}.jpg`,
          mimeType: "image/jpeg",
          content: buffer.toString("base64"),
          access: "public",
        },
      ])
      fresh.push(created.url)
    }
    const urls = [...fresh, ...kept]
    log(`${handle}: ${kept.length} kept → ${urls.length} image(s) (+${fresh.length} first)`)
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
