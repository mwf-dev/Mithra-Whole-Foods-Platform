import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { safeCssUrl } from "@lib/util/safe-css-url"
import { HomepageCard, resolveBackendImage } from "@lib/data/homepage"

/**
 * Admin-managed row of small offer/deal cards ("Under ₹99", "Deal of the
 * Day"). Hidden when no cards are configured.
 */
export function OfferCards({ cards }: { cards?: HomepageCard[] | null }) {
  const items = (cards ?? []).filter((c) => c.title || c.image_url)

  if (items.length === 0) {
    return null
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair">Special Offers</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {items.map((card, i) => (
            <LocalizedClientLink
              key={i}
              href={card.link || "/store"}
              className="relative rounded-xl overflow-hidden h-36 md:h-44 group block bg-[#F3F7F4]"
            >
              {card.image_url && (
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{
                    backgroundImage: `url('${safeCssUrl(
                      resolveBackendImage(card.image_url)
                    )}')`,
                  }}
                  role="img"
                  aria-label={card.title || "Offer"}
                />
              )}
              {card.title && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className="absolute bottom-3 left-3 right-3 z-10 text-white font-bold text-sm md:text-base drop-shadow">
                    {card.title}
                  </span>
                </>
              )}
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}
