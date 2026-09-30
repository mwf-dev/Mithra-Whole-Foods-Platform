import Image from "next/image"
import { Leaf } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { AISLES, Aisle, aisleHref, aisleProductIds } from "@modules/home/aisles"

function Disc({ aisle, index }: { aisle: Aisle; index: number }) {
  const { art, world } = aisle

  if (!art) {
    return (
      <div
        className="grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full"
        style={{ backgroundColor: world.bg, color: world.deep }}
      >
        <Leaf className="h-9 w-9" strokeWidth={1.5} aria-hidden />
      </div>
    )
  }

  if (art.kind === "label") {
    // Flat print artwork has no silhouette to lift out of the circle, so it
    // fills the disc and zooms instead.
    return (
      <div
        className="relative h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full ring-4 ring-white/60"
        style={{ backgroundColor: world.bg }}
      >
        <Image
          src={art.src}
          alt=""
          fill
          sizes="112px"
          quality={60}
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
    )
  }

  // Cut-out pack: anchored to the bottom of the disc and allowed to overflow
  // the top, so on hover it rises out of the circle.
  return (
    <div
      className="relative h-24 w-24 md:h-28 md:w-28 rounded-full ring-4 ring-white/60"
      style={{ backgroundColor: world.bg }}
    >
      <div className="absolute inset-x-2 bottom-2 top-[-18%] transition-transform duration-500 ease-out group-hover:-translate-y-5 group-hover:scale-110">
        {/* Idle bob, staggered so the row ripples rather than pulses. */}
        <div
          className="mithra-bob absolute inset-0"
          style={{ animationDelay: `${(index % 6) * -0.8}s` }}
        >
          <Image
            src={art.src}
            alt=""
            fill
            sizes="112px"
            quality={60}
            className="object-contain object-bottom drop-shadow-[0_6px_6px_rgba(0,0,0,0.25)]"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * "Shop by aisle": every aisle as a disc in its pack's colour. Counts come
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
      className="bg-white py-12 md:py-16"
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
              Everything in the Mithra kitchen
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
