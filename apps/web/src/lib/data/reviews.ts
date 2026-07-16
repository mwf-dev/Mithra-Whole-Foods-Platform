"use server"

import { revalidateTag } from "next/cache"

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"

export type ProductReview = {
  id: string
  customer_name: string
  rating: number
  title: string | null
  content: string
  verified_purchase: boolean
  created_at: string
}

export type ReviewSummary = {
  count: number
  average: number | null
  distribution: Record<number, number>
}

export type ProductReviewsResponse = {
  reviews: ProductReview[]
  count: number
  summary: ReviewSummary
}

const EMPTY_SUMMARY: ReviewSummary = {
  count: 0,
  average: null,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
}

/**
 * Approved reviews for a product. The backend never returns pending or
 * rejected rows, so there is no client-side filtering to get wrong.
 *
 * A failure here must not take down the whole product page — the review block
 * is supplementary — so this degrades to "no reviews" and logs, rather than
 * throwing into the PDP.
 */
export async function getProductReviews(
  productId: string,
  { limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<ProductReviewsResponse> {
  const next = {
    ...(await getCacheOptions(`product-reviews-${productId}`)),
  }

  try {
    return await sdk.client.fetch<ProductReviewsResponse>(
      `/store/products/${productId}/reviews`,
      {
        method: "GET",
        query: { limit, offset },
        next,
        cache: "force-cache",
      }
    )
  } catch (error) {
    console.error(`Could not load reviews for product ${productId}:`, error)
    return { reviews: [], count: 0, summary: EMPTY_SUMMARY }
  }
}

export type SubmitReviewState = {
  success: boolean
  error: string | null
  /** Set once the review is queued, so the form can say so. */
  pendingModeration?: boolean
}

/**
 * Submits a review as the signed-in customer. The review is queued for admin
 * approval, so nothing appears on the page straight away — the form says so
 * rather than leaving the shopper wondering where their words went.
 */
export async function createProductReview(
  _currentState: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const productId = formData.get("product_id")

  if (typeof productId !== "string" || !productId) {
    return { success: false, error: "Missing product." }
  }

  const rating = Number(formData.get("rating"))
  const content = String(formData.get("content") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Please choose a rating from 1 to 5 stars." }
  }

  if (!content) {
    return { success: false, error: "Please write a few words about it." }
  }

  const headers = { ...(await getAuthHeaders()) }

  try {
    await sdk.client.fetch(`/store/products/${productId}/reviews`, {
      method: "POST",
      body: { rating, content, title: title || undefined },
      headers,
    })
  } catch (error: any) {
    return { success: false, error: toReviewError(error) }
  }

  const cacheTag = await getCacheTag(`product-reviews-${productId}`)
  revalidateTag(cacheTag)

  return { success: true, error: null, pendingModeration: true }
}

/** Turns backend failures into something a shopper can act on. */
function toReviewError(error: any): string {
  const status = error?.status ?? error?.response?.status

  if (status === 401) {
    return "Please sign in to write a review."
  }

  if (status === 409) {
    return "You've already reviewed this product."
  }

  if (status === 400) {
    return "That review doesn't look right — check the rating and text."
  }

  console.error("Review submission failed:", error)
  return "Something went wrong sending your review. Please try again."
}
