import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import ProductReviewService from "../../../../modules/product-review/service"

const STATUSES = ["pending", "approved", "rejected"] as const
type Status = (typeof STATUSES)[number]

/**
 * Approve or reject a review.
 * POST /admin/product-reviews/:id  { status: "approved" | "rejected" }
 *
 * Rejected reviews are kept rather than deleted so the same customer can't
 * simply resubmit past the unique (product_id, customer_id) index.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { status } = (req.body ?? {}) as { status?: string }

  if (!status || !STATUSES.includes(status as Status)) {
    return res.status(400).json({
      message: `status must be one of: ${STATUSES.join(", ")}`,
    })
  }

  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const existing = await service.listProductReviews({ id: req.params.id })

  if (!existing.length) {
    return res.status(404).json({ message: "Review not found." })
  }

  const review = await service.updateProductReviews({
    id: req.params.id,
    status: status as Status,
  })

  res.json({ review })
}

/** Permanently removes a review — for spam that shouldn't occupy the queue. */
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  await service.deleteProductReviews(req.params.id)

  res.json({ id: req.params.id, object: "product_review", deleted: true })
}
