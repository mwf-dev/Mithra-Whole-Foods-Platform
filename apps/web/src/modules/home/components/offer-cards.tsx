import Image from "next/image"
import { ArrowRight, Tag } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Tilt from "@modules/common/components/tilt"
import { cloudinaryUrl } from "@lib/util/cloudinary"
import { safeCssUrl } from "@lib/util/safe-css-url"
import { HomepageCard, resolveBackendImage } from "@lib/data/homepage"
import { OFFER_THEMES, OFFER_THEME_CYCLE } from "@modules/home/aisles"
import { CopyCode } from "./copy-code"

/**
 * Admin-managed offers (Homepage → Offers). Each card is a large colour-themed
 * panel: badge, title, subtitle, optional discount code with a copy button,
 * and either the admin's uploaded picture or the theme's product pack, which
 * idles and tilts. Hidden when no offers are configured.
 *
 * The whole card is one link (an overlay anchor), with the copy button raised
 * above it so the two never nest.
 */
export function OfferCards({ cards }: { cards?: HomepageCard[] | null }) {
  const items = (cards ?? []).filter((c) => c.title)

  if (items.length === 0) {
    return null
  }

  return (
    <section className="bg-white py-12 md:py-16" aria-labelledby="offers-heading">
      <div className="content-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Offers
        </p>
        <h2
          id="offers-heading"
          className="mb-8 font-display text-3xl leading-[1.1] md:text-4xl text-charcoal"
        >
          Good reasons to stock up
        </h2>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {items.map((card, i) => {
            const theme =
              OFFER_THEMES[card.theme ?? ""] ??
              OFFER_THEMES[OFFER_THEME_CYCLE[i % OFFER_THEME_CYCLE.length]]
            const { world } = theme
            const uploaded = card.image_url
              ? safeCssUrl(cloudinaryUrl(resolveBackendImage(card.image_url), { width: 720 }))
              : ""
            const art = uploaded || theme.art
            const href = card.link || "/store"
            // An odd card out spans the full row instead of sitting alone.
            const wide = items.length % 2 === 1 && i === items.length - 1

            return (
              <li key={i} className={`mithra-reveal ${wide ? "md:col-span-2" : ""}`}>
                <Tilt shine className="h-full rounded-large shadow-card hover:shadow-card-xl">
                  <div
                    className="group relative flex h-[17rem] overflow-hidden rounded-large md:h-[19rem]"
                    style={{ background: theme.background ?? world.bg, color: world.ink }}
                  >
                    {/* Decorative rings that slowly turn behind the art. */}
                    <span
                      aria-hidden
                      className="absolute -right-16 -top-16 h-72 w-72 rounded-full border-[28px] opacity-10 transition-transform duration-[1.5s] ease-out group-hover:rotate-45 group-hover:scale-110"
                      style={{ borderColor: world.ink }}
                    />
                    <span
                      aria-hidden
                      className="absolute -bottom-24 right-24 h-56 w-56 rounded-full opacity-10"
                      style={{ backgroundColor: world.ink }}
                    />

                    <LocalizedClientLink
                      href={href}
                      aria-label={card.title}
                      className="absolute inset-0 z-10 rounded-large focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    />

                    <div className="pointer-events-none relative z-10 flex max-w-[58%] flex-col justify-center gap-3 p-6 md:max-w-[55%] md:p-8">
                      {card.badge && (
                        <span
                          className="inline-flex w-max items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: world.deep, color: "#FFFFFF" }}
                        >
                          <Tag size={12} aria-hidden />
                          {card.badge}
                        </span>
                      )}
                      <h3 className="font-display text-2xl leading-[1.05] md:text-[2.1rem] text-balance">
                        {card.title}
                      </h3>
                      {card.subtitle && (
                        <p className="text-sm leading-snug opacity-85 md:text-[15px]">
                          {card.subtitle}
                        </p>
                      )}
                      {card.code && (
                        <span className="pointer-events-auto">
                          <CopyCode code={card.code} ink={world.ink} deep={world.deep} />
                        </span>
                      )}
                      <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
                        {card.cta || "Shop now"}
                        <ArrowRight
                          size={16}
                          aria-hidden
                          className="transition-transform duration-300 group-hover:translate-x-1.5"
                        />
                      </span>
                    </div>

                    <div className="pointer-events-none absolute bottom-3 right-2 top-6 w-[48%] transition-transform duration-700 ease-out group-hover:-translate-y-2 group-hover:scale-105 md:right-4">
                      <div
                        className="mithra-bob absolute inset-0"
                        style={{ animationDelay: `${i * -1.3}s` }}
                      >
                        {art && (
                          <Image
                            src={art}
                            alt=""
                            fill
                            loading="lazy"
                            quality={75}
                            sizes="(max-width: 768px) 50vw, 360px"
                            className="object-contain object-bottom drop-shadow-[0_16px_18px_rgba(0,0,0,0.3)]"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </Tilt>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
