import { ArrowRight } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { LotusKolam } from "./botanicals"

/**
 * A repeating diamond-and-dot border, drawn once as an inline SVG so the band
 * needs no image request. Cream strokes on the green ground.
 */
const BORDER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='18' viewBox='0 0 36 18' fill='none' stroke='%23F4EEDC' stroke-opacity='.55' stroke-width='1.4'%3E%3Cpath d='M18 2l8 7-8 7-8-7z'/%3E%3Ccircle cx='2' cy='9' r='1.2' fill='%23F4EEDC' fill-opacity='.55' stroke='none'/%3E%3Ccircle cx='34' cy='9' r='1.2' fill='%23F4EEDC' fill-opacity='.55' stroke='none'/%3E%3C/svg%3E\")"

/**
 * A slim brand statement between the product rail and the festival banner.
 * Copy is ours and sticks to what is printed on the packs (wood-pressed oil,
 * roasted podi, cow ghee) — no health or "traditional is better" claims.
 */
export function StoryStrip() {
  return (
    <section aria-label="Our approach" className="bg-primary-dark text-cream">
      <div className="h-[18px] opacity-90" style={{ backgroundImage: BORDER, backgroundRepeat: "repeat-x" }} aria-hidden />
      <div className="content-container relative flex flex-col items-center gap-5 py-9 text-center md:flex-row md:justify-between md:gap-10 md:py-10 md:text-left">
        <LotusKolam className="hidden h-24 w-24 shrink-0 text-cream/40 md:block" />
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cream/70">
            Kitchen basics, the old way
          </p>
          <h2 className="mt-2 font-display text-3xl leading-[1.1] md:text-[2.6rem]">
            Old recipes deserve old-fashioned ingredients.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-cream/80 md:text-base">
            Wood-pressed oils, freshly roasted podis and pure cow ghee. Made in
            India, shipped from our shop in Exton, PA.
          </p>
        </div>
        <LocalizedClientLink
          href="/store"
          className="group/cta inline-flex shrink-0 items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-semibold text-primary-dark transition-transform hover:-translate-y-0.5"
        >
          Explore the aisles
          <ArrowRight size={16} aria-hidden className="transition-transform group-hover/cta:translate-x-1" />
        </LocalizedClientLink>
        <LotusKolam className="hidden h-24 w-24 shrink-0 text-cream/40 large:block" />
      </div>
      <div className="h-[18px] opacity-90" style={{ backgroundImage: BORDER, backgroundRepeat: "repeat-x" }} aria-hidden />
    </section>
  )
}
