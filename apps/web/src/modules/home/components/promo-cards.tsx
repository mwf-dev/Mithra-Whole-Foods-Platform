import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { safeCssUrl } from "@lib/util/safe-css-url"
import { ArrowRight } from "lucide-react"

interface PromoSettings {
  promo_card_1_title?: string | null
  promo_card_1_url?: string | null
  promo_card_2_title?: string | null
  promo_card_2_url?: string | null
}

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

function resolveImage(url?: string | null): string {
  if (!url) {
    return ""
  }
  return url.startsWith("/") ? `${BACKEND_URL}${url}` : url
}

/**
 * Two admin-managed promotional banners (Homepage settings in the admin
 * panel). A card renders when it has an image or a title; the whole section
 * disappears when both cards are empty.
 */
export function PromoCards({ settings }: { settings?: PromoSettings | null }) {
  const cards = [
    { title: settings?.promo_card_1_title, image: resolveImage(settings?.promo_card_1_url) },
    { title: settings?.promo_card_2_title, image: resolveImage(settings?.promo_card_2_url) },
  ].filter((c) => c.title || c.image)

  if (cards.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-[#FBF7F0]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div
          className={`grid grid-cols-1 gap-6 ${
            cards.length > 1 ? "md:grid-cols-2" : ""
          }`}
        >
          {cards.map((card, i) => (
            <LocalizedClientLink
              key={i}
              href="/store"
              className="relative rounded-2xl overflow-hidden h-56 md:h-64 group block bg-gray-100"
            >
              {card.image && (
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url('${safeCssUrl(card.image)}')` }}
                  role="img"
                  aria-label={card.title || "Promotional offer"}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
              <div className="relative z-10 h-full flex flex-col justify-center px-8 max-w-sm">
                {card.title && (
                  <h3 className="text-2xl md:text-3xl font-bold text-white drop-shadow mb-4">
                    {card.title}
                  </h3>
                )}
                <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                  Shop Now <ArrowRight size={16} />
                </span>
              </div>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}
