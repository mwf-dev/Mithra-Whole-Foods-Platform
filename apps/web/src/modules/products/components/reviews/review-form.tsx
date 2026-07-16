"use client"

import { Button } from "@medusajs/ui"
import { Star } from "lucide-react"
import { useActionState, useState } from "react"

import { createProductReview, SubmitReviewState } from "@lib/data/reviews"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const INITIAL: SubmitReviewState = { success: false, error: null }

/**
 * Write-a-review form. Guests get a sign-in link instead of a form: the write
 * needs an account, and finding that out only after typing a review would be a
 * waste of their effort.
 */
export default function ReviewForm({
  productId,
  isSignedIn,
  pathname,
  countryCode,
}: {
  productId: string
  isSignedIn: boolean
  pathname: string
  countryCode: string
}) {
  const [state, formAction, isPending] = useActionState(
    createProductReview,
    INITIAL
  )
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <p className="text-sm text-gray-600">
          Please{" "}
          <LocalizedClientLink
            href={`/account?redirect=${encodeURIComponent(pathname)}`}
            className="font-medium text-gray-900 underline"
          >
            sign in
          </LocalizedClientLink>{" "}
          to write a review.
        </p>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <p className="font-medium text-green-900">Thanks for the review!</p>
        <p className="mt-1 text-sm text-green-800">
          We read every review before it goes up, so it&apos;ll appear on this page
          once it&apos;s approved.
        </p>
      </div>
    )
  }

  const shown = hovered || rating

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-gray-100 bg-white p-6"
    >
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <h3 className="font-medium text-gray-900">Write a review</h3>

      <div
        className="mt-4 flex items-center gap-1"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            aria-pressed={rating === star}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={26}
              className={
                star <= shown
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }
            />
          </button>
        ))}
      </div>

      <input
        type="text"
        name="title"
        maxLength={120}
        placeholder="Add a headline (optional)"
        className="mt-4 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
      />

      <textarea
        name="content"
        rows={4}
        maxLength={4000}
        required
        placeholder="What did you think of it?"
        className="mt-3 w-full resize-y rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
      />

      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        isLoading={isPending}
        disabled={!rating}
        className="mt-4 rounded-full"
      >
        Submit review
      </Button>

      <p className="mt-3 text-xs text-gray-500">
        Reviews are checked before they appear.
      </p>
    </form>
  )
}
