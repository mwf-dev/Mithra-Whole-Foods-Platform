import {
  Award,
  CalendarDays,
  ChefHat,
  Check,
  Coffee,
  Cookie,
  Droplets,
  Flame,
  Gift,
  Hammer,
  Hourglass,
  House,
  Info,
  Layers,
  Leaf,
  MapPin,
  Nut,
  Package,
  Scale,
  Soup,
  Sprout,
  Sun,
  Timer,
  UtensilsCrossed,
  Wheat,
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
  wheat: Wheat,
  droplets: Droplets,
  leaf: Leaf,
  soup: Soup,
  cookie: Cookie,
  coffee: Coffee,
  package: Package,
  sun: Sun,
  chef: ChefHat,
  pin: MapPin,
  hammer: Hammer,
  timer: Timer,
  gift: Gift,
  layers: Layers,
  nut: Nut,
  home: House,
}

/**
 * Long-form product story under the buy box: headline, intro, a grid of what
 * makes the product special, an optional "how to enjoy" list and note, and an
 * optional closing band. Copy lives in `stories/*.ts`; products without an
 * entry render nothing.
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
        <h3 className="text-2xl text-charcoal sm:text-3xl">
          {story.pointsHeading ?? "What makes it special"}
        </h3>
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

      {(story.uses || story.note) && (
        <div className="grid grid-cols-1 gap-4 border-t border-gray-100 px-5 py-10 sm:px-10 lg:grid-cols-5 lg:px-14 lg:py-14">
          {story.uses && (
            <div className="rounded-xl border border-gray-100 bg-cream p-6 lg:col-span-3">
              <h3 className="text-xl text-charcoal sm:text-2xl">{story.uses.heading}</h3>
              <ul className="mt-4 space-y-3">
                {story.uses.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-grey-70 sm:text-base">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white"
                    >
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {story.note && (
            <div
              className={`rounded-xl border border-terracotta/20 bg-beige p-6 ${
                story.uses ? "lg:col-span-2" : "lg:col-span-5"
              }`}
            >
              <h3 className="flex items-center gap-2 font-sans text-base font-semibold text-terracotta">
                <Info size={18} aria-hidden />
                {story.note.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-grey-70 sm:text-base">
                {story.note.text}
              </p>
            </div>
          )}
        </div>
      )}

      {story.closing && (
        <div className="border-t border-gray-100 bg-primary px-5 py-10 text-center text-white sm:px-10 lg:py-14">
          {story.closingHeading && (
            <h3 className="text-2xl sm:text-3xl">{story.closingHeading}</h3>
          )}
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
            {story.closing}
          </p>
          {story.signoff && (
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.1em] text-white/80">
              {story.signoff}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
