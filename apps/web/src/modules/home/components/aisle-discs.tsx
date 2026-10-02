import { Leaf } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { AISLES, Aisle, aisleHref, aisleProductIds } from "@modules/home/aisles"
import { AisleIllustration, hasIllustration } from "./aisle-illustrations"

function Disc({ aisle, index }: { aisle: Aisle; index: number }) {
  const { world } = aisle
  return (
    <div
      className="grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full ring-4 ring-white/60 shadow-card-sm transition-shadow duration-300 group-hover:shadow-card-lg"
      style={{ backgroundColor: world.bg, color: world.deep }}
    >
      {/* Idle bob, staggered so the row ripples rather than pulses; lifts
          on hover. */}
      <div className="transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:scale-110">
        <div
          className="mithra-bob"
          style={{ animationDelay: `${(index % 6) * -0.8}s` }}
        >
          <AisleIllustration
            id={aisle.id}
            world={world}
            className="h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]"
          />
          {/* Fallback for an aisle with no drawing yet. */}
          {!hasIllustration(aisle.id) && (
            <Leaf className="h-9 w-9" strokeWidth={1.5} aria-hidden />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * "Shop by aisle": every aisle as a disc in its pack's colour, with a drawn
 * illustration rather than a product photo (client request — categories
 * should read as categories, not as one product). Counts come
 * from the backend categories; aisles with nothing in the catalog yet say so
 * instead of linking to an empty page.
 */
export function AisleDiscs({
  categories = [],
}: {
  categories?: HttpTypes.StoreProductCategory[]
}) {
  return (
    <section
      className="bg-white pt-10 pb-12 md:pt-0 md:pb-16"
      aria-labelledby="aisles-heading"
    >
      <div className="content-container">
        <div className="mb-2 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Shop by aisle
            </p>
            <h2
              id="aisles-heading"
              className="font-display text-3xl leading-[1.1] md:text-4xl text-charcoal"
            >
              Everything at Mithra Whole Foods
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="hidden sm:inline text-sm font-semibold text-primary hover:underline"
          >
            View all products
          </LocalizedClientLink>
        </div>
      </div>

      {/* `w-max max-w-full mx-auto` centres the row when it fits and turns it
          into a full-width scroller when it doesn't — `justify-center` on an
          overflowing flex row would clip the first discs off-screen. */}
      <ul className="no-scrollbar mx-auto flex w-max max-w-full snap-x snap-mandatory gap-5 md:gap-7 overflow-x-auto px-6 pt-10 pb-2 scroll-px-6">
        {AISLES.map((aisle, index) => {
          const count = aisleProductIds(aisle, categories).size
          const body = (
            <>
              <Disc aisle={aisle} index={index} />
              <span className="mt-3 max-w-[7.5rem] text-center text-sm font-semibold leading-tight text-charcoal group-hover:text-primary">
                {aisle.name}
              </span>
              <span className="mt-1 text-xs text-grey-50">
                {count === 0
                  ? "Coming soon"
                  : count === 1
                  ? "1 product"
                  : `${count} products`}
              </span>
            </>
          )

          return (
            <li key={aisle.id} className="shrink-0 snap-start">
              {count === 0 ? (
                <div className="group flex flex-col items-center">{body}</div>
              ) : (
                <LocalizedClientLink
                  href={aisleHref(aisle)}
                  className="group flex flex-col items-center rounded-large focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  {body}
                </LocalizedClientLink>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
