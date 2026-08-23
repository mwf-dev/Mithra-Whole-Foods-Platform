import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_BRIEF_MODULE } from "../../../../modules/product-brief"
import type ProductBriefService from "../../../../modules/product-brief/service"
import {
  briefToYaml,
  normalizeSlides,
  normalizeSummary,
} from "../../../../lib/content-studio"

/**
 * GET /admin/content-briefs/:productId[?format=yaml]
 *
 * `format=yaml` returns the brief in the exact shape the PIDS operator prompt
 * expects (docs/PIDS_OPERATOR_PROMPT.md) — copy it, paste it into the image
 * pipeline, no retyping. That round trip is the reason the studio exists.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [brief] = await briefService.listProductBriefs({ product_id: req.params.productId })

  if (!brief) {
    res.status(404).json({ message: "No brief saved for this product yet." })
    return
  }

  if (req.query.format === "yaml") {
    res.setHeader("Content-Type", "text/yaml; charset=utf-8")
    res.send(briefToYaml(brief as any))
    return
  }

  res.json({
    brief: {
      ...brief,
      summary: normalizeSummary(brief.summary),
      slides: normalizeSlides(brief.slides),
      yaml: briefToYaml(brief as any),
    },
  })
}

/** POST /admin/content-briefs/:productId  { status } — approve or send back. */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>
  const status = String(body.status ?? "")

  if (!["draft", "submitted", "approved"].includes(status)) {
    res.status(400).json({ message: "status must be draft, submitted or approved" })
    return
  }

  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [brief] = await briefService.listProductBriefs({ product_id: req.params.productId })
  if (!brief) {
    res.status(404).json({ message: "No brief saved for this product yet." })
    return
  }

  const updated = await briefService.updateProductBriefs({
    id: brief.id,
    status: status as "draft" | "submitted" | "approved",
  })
  res.json({ brief: Array.isArray(updated) ? updated[0] : updated })
}
