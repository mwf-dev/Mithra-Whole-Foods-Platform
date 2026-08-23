import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_BRIEF_MODULE } from "../../../modules/product-brief"
import type ProductBriefService from "../../../modules/product-brief/service"
import {
  countFilledSlides,
  isEmptyBrief,
  normalizeSlides,
  normalizeSummary,
} from "../../../lib/content-studio"
import { guard, noStore } from "../_shared"

/**
 * GET /content-studio/products?t=<token>
 *
 * The studio's index: every catalog product as a card, with the images it
 * already has and how far its brief has got. One query for products, one for
 * briefs — deliberately not per-product lookups, because the catalog is ~54
 * items and the backend sits ~290ms from the database (see CLAUDE.md).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "images.id", "images.url"],
    pagination: { take: 500, order: { title: "ASC" } },
  })

  const briefs = await briefService.listProductBriefs({})
  const byProduct = new Map<string, any>()
  for (const brief of briefs) byProduct.set(brief.product_id, brief)

  const items = (products as any[]).map((product) => {
    const brief = byProduct.get(product.id)
    const summary = normalizeSummary(brief?.summary)
    const slides = normalizeSlides(brief?.slides)
    const empty = !brief || isEmptyBrief(summary, slides)

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail || product.images?.[0]?.url || null,
      image_count: product.images?.length ?? 0,
      product_status: product.status,
      status: empty ? "not_started" : brief.status,
      slide_count: slides.length,
      filled_slide_count: countFilledSlides(slides),
      updated_at: brief?.updated_at ?? null,
      updated_by: brief?.updated_by ?? null,
    }
  })

  res.json({ products: items, count: items.length })
}
