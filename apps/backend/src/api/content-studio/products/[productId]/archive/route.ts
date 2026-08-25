import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_BRIEF_MODULE } from "../../../../../modules/product-brief"
import type ProductBriefService from "../../../../../modules/product-brief/service"
import { isClientProductId, normalizeSummary } from "../../../../../lib/content-studio"
import { guard, noStore } from "../../../_shared"

/**
 * POST /content-studio/products/:productId/archive?t=
 * { archived: boolean, reason?: string, by?: string }
 *
 * The client's "remove this product" button — and the reason this route is not
 * a DELETE. Nothing is deleted: the product stays in the catalog, keeps
 * selling, and keeps whatever brief has been written for it. All this does is
 * set `archived_at`, which moves the card into the studio's "Removed products"
 * drawer and flags it in admin → Content briefs, where a human decides whether
 * to actually unpublish it. Restoring is the same call with archived: false.
 *
 * A product the client has never touched has no brief row yet, so one is
 * created purely to carry the flag. It derives as "not started" everywhere,
 * which is correct — no copy has been written for it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const productId = req.params.productId
  const body = (req.body ?? {}) as Record<string, unknown>
  const archived = body.archived !== false
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000).trim() : ""
  const by = typeof body.by === "string" ? body.by.slice(0, 200) : ""

  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [existing] = await briefService.listProductBriefs({ product_id: productId })

  if (!existing) {
    if (isClientProductId(productId)) {
      res.status(404).json({ message: "That product no longer exists." })
      return
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle"],
      filters: { id: productId } as any,
    })
    const product = (data as any[])[0]
    if (!product) {
      res.status(404).json({ message: "Product not found" })
      return
    }

    const created = await briefService.createProductBriefs({
      product_id: productId,
      origin: "catalog",
      product_title: product.title ?? null,
      product_handle: product.handle ?? null,
      summary: normalizeSummary({}),
      slides: [],
      archived_at: archived ? new Date() : null,
      archive_reason: archived && reason ? reason : null,
      archived_by: archived && by ? by : null,
      updated_by: by || null,
    } as any)

    const brief = Array.isArray(created) ? created[0] : created
    res.json({ archived: !!brief.archived_at, archive_reason: brief.archive_reason })
    return
  }

  const updated = await briefService.updateProductBriefs({
    id: existing.id,
    archived_at: archived ? existing.archived_at ?? new Date() : null,
    archive_reason: archived ? reason || existing.archive_reason || null : null,
    archived_by: archived ? by || existing.archived_by || null : null,
  } as any)

  const brief = Array.isArray(updated) ? updated[0] : updated
  res.json({ archived: !!brief.archived_at, archive_reason: brief.archive_reason })
}
