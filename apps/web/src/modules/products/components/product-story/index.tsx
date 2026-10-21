import {
  Award,
  CalendarDays,
  Flame,
  Hourglass,
  Scale,
  Sprout,
  UtensilsCrossed,
} from "lucide-react"

import type { ProductStory, StoryPointIcon } from "@modules/products/product-stories"

const ICONS: Record<StoryPointIcon, typeof Sprout> = {
  sprout: Sprout,
  hourglass: Hourglass,
  calendar: CalendarDays,
  award: Award,
  scale: Scale,
  flame: Flame,
  meal: UtensilsCrossed,
}

/**
 * Long-form product story under the buy box: headline, intro, a grid of what
 * makes the product special, and a closing note. Copy lives in
 * `product-stories.ts`; products without an entry render nothing.
 */
export default function ProductStorySection({ story }: { story: ProductStory }) {
  return (
    <section
      aria-labelledby="product-story-heading"
      data-testid="product-story"
      className="mt-8 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
    >
      <div className="bg-beige px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-terracotta">
          {story.eyebrow}
        </p>
        <h2
          id="product-story-heading"
          className="mt-3 max-w-3xl text-3xl leading-tight text-charcoal sm:text-4xl"
        >
          {story.headline}
        </h2>
        <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-grey-70 sm:text-lg">
          {story.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </div>

      <div className="px-5 py-10 sm:px-10 lg:px-14 lg:py-14">
        <h3 className="text-2xl text-charcoal sm:text-3xl">{story.pointsHeading}</h3>
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {story.points.map(({ icon, title, text }) => {
            const Icon = ICONS[icon]
            return (
              <li
                key={title}
                className="flex gap-4 rounded-xl border border-gray-100 bg-cream p-5"
              >
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <div>
                  <h4 className="font-sans text-base font-semibold text-charcoal">
                    {title}
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-grey-60">{text}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-gray-100 bg-primary px-5 py-10 text-center text-white sm:px-10 lg:py-14">
        <h3 className="text-2xl sm:text-3xl">{story.closingHeading}</h3>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
          {story.closing}
        </p>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.1em] text-white/80">
          {story.signoff}
        </p>
      </div>
    </section>
  )
}
