import {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"

import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import ProductReviewService from "../../../../../modules/product-review/service"

const CreateReview = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(1).max(4000),
})

/**
 * Public: approved reviews for a product, plus the rating summary.
 *
 * Only `approved` rows are ever returned. Pending and rejected reviews are not
 * exposed here in any form — not even as a count — since that would leak the
 * contents of the moderation queue.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id
  const limit = Math.min(
    parseInt((req.query.limit as string) ?? "20", 10) || 20,
    50
  )
  const offset = parseInt((req.query.offset as string) ?? "0", 10) || 0

  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const [reviews, count] = await service.listAndCountProductReviews(
    { product_id: productId, status: "approved" },
    {
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    }
  )

  // Averaged over every approved review, not just the page being returned.
  const all = await service.listProductReviews(
    { product_id: productId, status: "approved" },
    { select: ["rating"] }
  )

  const distribution = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
    (acc, star) => {
      acc[star] = all.filter((r) => r.rating === star).length
      return acc
    },
    {}
  )

  res.json({
    reviews,
    count,
    summary: {
      count: all.length,
      average: all.length
        ? Math.round(
            (all.reduce((sum, r) => sum + r.rating, 0) / all.length) * 10
          ) / 10
        : null,
      distribution,
    },
  })
}

/**
 * Writes a review as the signed-in customer. Always lands as `pending` — an
 * admin approves it before it is public.
 *
 * Authentication is enforced by the `authenticate("customer")` middleware
 * registered for this matcher in `src/api/middlewares.ts`, so `actor_id` is the
 * caller and the client cannot claim to be someone else.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "You must be signed in to review." })
  }

  const parsed = CreateReview.safeParse(req.body ?? {})

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid review.",
      errors: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    })
  }

  const productId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: { id: productId },
  })

  if (!products?.length) {
    return res.status(404).json({ message: "Product not found." })
  }

  const service: ProductReviewService = req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const existing = await service.listProductReviews({
    product_id: productId,
    customer_id: customerId,
  })

  if (existing.length) {
    return res.status(409).json({
      message: "You've already reviewed this product.",
    })
  }

  const [customerName, verifiedPurchase] = await Promise.all([
    resolveCustomerName(query, customerId),
    hasPurchased(query, customerId, productId),
  ])

  const review = await service.createProductReviews({
    product_id: productId,
    customer_id: customerId,
    customer_name: customerName,
    rating: parsed.data.rating,
    title: parsed.data.title ?? null,
    content: parsed.data.content,
    status: "pending",
    verified_purchase: verifiedPurchase,
  })

  res.status(201).json({ review })
}

/** Display name for the byline. Falls back rather than exposing the email. */
async function resolveCustomerName(
  query: any,
  customerId: string
): Promise<string> {
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["first_name", "last_name"],
    filters: { id: customerId },
  })

  const customer = customers?.[0]
  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()

  return name || "Verified customer"
}

/**
 * Whether this customer has ever ordered this product. Drives the "Verified
 * Purchase" badge only — anyone signed in may review either way.
 */
async function hasPurchased(
  query: any,
  customerId: string,
  productId: string
): Promise<boolean> {
  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.product_id"],
      filters: { customer_id: customerId },
    })

    return (orders ?? []).some((order: any) =>
      (order.items ?? []).some((item: any) => item.product_id === productId)
    )
  } catch (error) {
    // A badge is not worth failing the write over.
    console.error("Could not resolve verified-purchase status:", error)
    return false
  }
}
