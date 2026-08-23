import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_BRIEF_MODULE } from "../../../modules/product-brief"
import type ProductBriefService from "../../../modules/product-brief/service"
import {
  countFilledSlides,
  isEmptyBrief,
  normalizeSlides,
  normalizeSummary,
} from "../../../lib/content-studio"

/**
 * GET /admin/content-briefs
 *
 * Review queue for what the client has filled in at /content-studio.
 * Admin-authenticated by Medusa's own middleware.
 *
 * The response includes the studio link *with* its token. That is deliberate:
 * anyone who can call an /admin route already has full control of the store,
 * so withholding it from them buys nothing and costs the operator a trip to
 * the Railway dashboard every time they need to re-send the link.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const briefs = await briefService.listProductBriefs(
    {},
    { order: { updated_at: "DESC" } }
  )

  const items = briefs.map((brief: any) => {
    const summary = normalizeSummary(brief.summary)
    const slides = normalizeSlides(brief.slides)
    return {
      id: brief.id,
      product_id: brief.product_id,
      product_title: brief.product_title,
      product_handle: brief.product_handle,
      status: isEmptyBrief(summary, slides) ? "not_started" : brief.status,
      slide_count: slides.length,
      filled_slide_count: countFilledSlides(slides),
      image_count: slides.reduce((total, slide) => total + slide.images.length, 0),
      updated_at: brief.updated_at,
      updated_by: brief.updated_by,
      submitted_at: brief.submitted_at,
    }
  })

  const token = process.env.CONTENT_STUDIO_TOKEN
  const proto = (req.headers["x-forwarded-proto"] as string) || "http"
  const host = req.headers.host
  const studioUrl =
    token && host ? `${proto}://${host}/content-studio?t=${encodeURIComponent(token)}` : null

  res.json({ briefs: items, count: items.length, studio_url: studioUrl })
}
