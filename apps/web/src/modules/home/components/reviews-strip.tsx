import { BadgeCheck } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FeaturedReview } from "@lib/data/reviews"
import StarRating from "@modules/products/components/reviews/star-rating"

/** Below this many approved reviews the strip would look thin, so it hides. */
const MIN_REVIEWS = 3

/**
 * Real, approved customer reviews only — pulled from the product-review
 * module, which admins moderate. Never seeded or invented; the section simply
 * does not render until there are enough of them.
 */
export function ReviewsStrip({ reviews }: { reviews: FeaturedReview[] }) {
  if (reviews.length < MIN_REVIEWS) {
    return null
  }

  return (
    <section className="bg-white py-12 md:py-16" aria-labelledby="reviews-heading">
      <div className="content-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          From our customers
        </p>
        <h2 id="reviews-heading" className="mb-8 font-display text-3xl leading-[1.1] md:text-4xl text-charcoal">
          Kitchens that already stock Mithra
        </h2>
      </div>
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 scroll-px-6 large:px-[calc((100vw-1440px)/2+1.5rem)]">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex w-[82%] shrink-0 snap-start flex-col gap-3 rounded-large border border-beige bg-cream p-5 xsmall:w-[46%] small:w-[31%]"
          >
            <StarRating rating={r.rating} />
            {r.title && <p className="font-semibold text-charcoal">{r.title}</p>}
            <p className="line-clamp-5 flex-1 text-sm leading-relaxed text-charcoal/85">
              {r.content}
            </p>
            <div className="flex items-center justify-between gap-3 border-t border-beige pt-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-charcoal">
                {r.customer_name}
                {r.verified_purchase && (
                  <BadgeCheck size={14} className="text-primary" aria-label="Verified purchase" />
                )}
              </span>
              <LocalizedClientLink
                href={`/products/${r.product.handle}`}
                className="line-clamp-1 text-right text-primary hover:underline"
              >
                {r.product.title}
              </LocalizedClientLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
