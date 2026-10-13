import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Adds AI-generated gallery images to a product without touching the ones it
 * already has: `first` go in front (e.g. the white packshot + hover image that
 * drive the product card), `last` are appended after the existing gallery
 * (the explainer slides: claim, benefits, how to make, ways to enjoy…).
 *
 * Manifest: <dir>/manifest.json =
 *   { handle: { first?: ["01-packshot.jpg", …], last?: ["slide-01-claim.jpg", …] } }
 * Files live in <dir>/<handle>/. Uploaded as `<prefix>-<handle>-<name>` where
 * the name is the file's base name, so a re-run is recognised and skipped:
 * a product whose images already include `<prefix>-<handle>-<first file>` is left alone.
 *
 *   cd apps/backend && SLIDES=/path/to/dir DRY_RUN=1 \
 *     NODE_ENV=development npx medusa exec ./src/scripts/gallery/add-slides.ts
 *
 * Drop DRY_RUN to apply. Snapshot first (`../catalog-snapshot.ts`): old URLs
 * stay valid, so a snapshot is enough to roll back.
 */
type Entry = { first?: string[]; last?: string[] }

export default async function addSlides({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const fileService: any = container.resolve(Modules.FILE)
  const dryRun = !!process.env.DRY_RUN
  const prefix = process.env.PREFIX || "studio"
  const dir = process.env.SLIDES!
  const manifest: Record<string, Entry> = JSON.parse(
    await fs.readFile(path.join(dir, "manifest.json"), "utf-8")
  )
  const log = (m: string) => logger.info(`[slides]${dryRun ? " (dry run)" : ""} ${m}`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "images.url", "images.rank"],
  })
  const byHandle = new Map<string, any>(products.map((p: any) => [p.handle, p]))

  const upload = async (handle: string, file: string) => {
    if (dryRun) return `dry-run://${file}`
    const buffer = await fs.readFile(path.join(dir, handle, file))
    const [created] = await fileService.createFiles([
      {
        filename: `${prefix}-${handle}-${file.replace(/\.[^.]+$/, "")}.jpg`,
        mimeType: "image/jpeg",
        content: buffer.toString("base64"),
        access: "public",
      },
    ])
    return created.url as string
  }

  for (const [handle, entry] of Object.entries(manifest)) {
    const product = byHandle.get(handle)
    if (!product) {
      logger.warn(`[slides] ${handle} not in catalog — skipped`)
      continue
    }
    const existing: string[] = [...(product.images ?? [])]
      .sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))
      .map((i: any) => i.url)
    const marker = entry.first?.[0] ?? entry.last?.[0]
    if (marker && existing.some((u) => u.includes(`${prefix}-${handle}-${marker.replace(/\.[^.]+$/, "")}`))) {
      log(`skip ${handle} (already added)`)
      continue
    }
    const first: string[] = []
    for (const f of entry.first ?? []) first.push(await upload(handle, f))
    const last: string[] = []
    for (const f of entry.last ?? []) last.push(await upload(handle, f))
    const urls = [...first, ...existing, ...last]
    log(`${handle}: ${first.length} in front, ${existing.length} kept, ${last.length} after → ${urls.length}`)
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
