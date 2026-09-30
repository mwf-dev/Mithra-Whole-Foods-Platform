import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewService from "../../../modules/product-review/service"

/**
 * Public: the most recent approved reviews across the whole catalog, for the
 * homepage reviews strip. Same moderation rule as the per-product route —
 * only `approved` rows, never a hint of what is pending.
 *
 * `min_rating` defaults to 4: the strip is a showcase, and the full picture
 * (every approved rating) stays on each product page.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? "8", 10) || 8,
    12
  )
  const minRating = Math.min(
    Math.max(parseInt((req.query.min_rating as string) ?? "4", 10) || 4, 1),
    5
  )

  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const reviews = await service.listProductReviews(
    { status: "approved", rating: { $gte: minRating } },
    { order: { created_at: "DESC" }, take: limit }
  )

  const productIds = [...new Set(reviews.map((r) => r.product_id))]
  const products: { id: string; title: string; handle: string; thumbnail: string | null }[] = []

  if (productIds.length) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "title", "handle", "thumbnail"],
      filters: { id: productIds },
    })
    products.push(...(data ?? []))
  }

  const byId = new Map(products.map((p) => [p.id, p]))

  res.json({
    reviews: reviews
      // A review whose product was deleted has nowhere to link to.
      .filter((r) => byId.has(r.product_id))
      .map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        customer_name: r.customer_name,
        verified_purchase: r.verified_purchase,
        created_at: r.created_at,
        product: byId.get(r.product_id),
      })),
  })
}
