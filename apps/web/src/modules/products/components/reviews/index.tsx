import { getProductReviews } from "@lib/data/reviews"
import { retrieveCustomer } from "@lib/data/customer"

import ReviewForm from "./review-form"
import StarRating from "./star-rating"

/**
 * The reviews block on a product page: rating summary, the approved reviews,
 * and the write-a-review form.
 */
export default async function ProductReviews({
  productId,
  handle,
  countryCode,
}: {
  productId: string
  handle: string
  countryCode: string
}) {
  const [{ reviews, summary }, customer] = await Promise.all([
    getProductReviews(productId),
    retrieveCustomer(),
  ])

  return (
    <section className="mt-12" id="reviews">
      <h2 className="mb-6 font-playfair text-2xl font-bold text-gray-900 md:text-3xl">
        Reviews
      </h2>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="flex flex-col gap-6">
          <RatingSummary summary={summary} />

          <ReviewForm
            productId={productId}
            isSignedIn={!!customer}
            pathname={`/${countryCode}/products/${handle}`}
            countryCode={countryCode}
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 md:p-8">
          {reviews.length ? (
            <ul className="flex flex-col divide-y divide-gray-100">
              {reviews.map((review) => (
                <li key={review.id} className="py-5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating rating={review.rating} />
                    {review.title && (
                      <span className="font-medium text-gray-900">
                        {review.title}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{review.customer_name}</span>
                    <span aria-hidden="true">·</span>
                    <time dateTime={review.created_at}>
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    {review.verified_purchase && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                        Verified purchase
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                    {review.content}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No reviews yet — be the first to share what you thought.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function RatingSummary({
  summary,
}: {
  summary: Awaited<ReturnType<typeof getProductReviews>>["summary"]
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6">
      {summary.average === null ? (
        <p className="text-sm text-gray-500">Not yet rated</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-gray-900">
              {summary.average.toFixed(1)}
            </span>
            <div>
              <StarRating rating={summary.average} size={18} />
              <p className="mt-1 text-xs text-gray-500">
                {summary.count} review{summary.count === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <ul className="mt-5 flex flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.distribution?.[star] ?? 0
              const pct = summary.count ? (n / summary.count) * 100 : 0

              return (
                <li key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-gray-500">{star}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-gray-500">{n}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
