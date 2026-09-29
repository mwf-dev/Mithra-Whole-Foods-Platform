import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewService from "../../../modules/product-review/service"

const STATUSES = ["pending", "approved", "rejected"] as const
type Status = (typeof STATUSES)[number]

/**
 * The moderation queue. `/admin/*` is authenticated by Medusa's own admin
 * session middleware, so there is no auth to add here.
 *
 * GET /admin/product-reviews?status=pending
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const status = req.query.status as string | undefined
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? "50", 10) || 50,
    100
  )
  const offset = parseInt((req.query.offset as string) ?? "0", 10) || 0

  const filters: Record<string, unknown> = {}
  if (status && STATUSES.includes(status as Status)) {
    filters.status = status
  }

  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const [reviews, count] = await service.listAndCountProductReviews(filters, {
    order: { created_at: "DESC" },
    take: limit,
    skip: offset,
  })

  // Product titles for the queue, resolved in one query rather than per row.
  const productIds = [...new Set(reviews.map((r) => r.product_id))]
  const titles = await resolveProductTitles(req, productIds)

  res.json({
    reviews: reviews.map((review) => ({
      ...review,
      product_title: titles[review.product_id] ?? review.product_id,
    })),
    count,
  })
}

async function resolveProductTitles(
  req: MedusaRequest,
  productIds: string[]
): Promise<Record<string, string>> {
  if (!productIds.length) {
    return {}
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "title"],
      filters: { id: productIds },
    })

    return Object.fromEntries(
      (products ?? []).map((p: any) => [p.id, p.title])
    )
  } catch (error) {
    console.error("Could not resolve product titles for reviews:", error)
    return {}
  }
}
