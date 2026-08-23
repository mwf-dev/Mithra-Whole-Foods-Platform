import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_BRIEF_MODULE } from "../../../../../modules/product-brief"
import type ProductBriefService from "../../../../../modules/product-brief/service"
import { guard, noStore } from "../../../_shared"

/**
 * POST /content-studio/briefs/:productId/submit?t=  { submitted: boolean }
 *
 * "Mark as ready for Mithra" / "reopen for editing". A submitted brief stays
 * editable on purpose — locking it would mean a typo needs a support request,
 * and the admin review page shows the timestamp either way.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const productId = req.params.productId
  const body = (req.body ?? {}) as Record<string, unknown>
  const submitted = body.submitted !== false

  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [existing] = await briefService.listProductBriefs({ product_id: productId })
  if (!existing) {
    res.status(404).json({ message: "Nothing saved for this product yet." })
    return
  }

  // An approved brief is the admin's call, not the client's — reopening it for
  // edits is fine, but the client can't self-approve or re-submit over it.
  const status: "submitted" | "draft" = submitted ? "submitted" : "draft"

  const updated = await briefService.updateProductBriefs({
    id: existing.id,
    status,
    submitted_at: submitted ? new Date() : null,
  })

  const brief = Array.isArray(updated) ? updated[0] : updated
  res.json({ status: brief.status, submitted_at: brief.submitted_at })
}
