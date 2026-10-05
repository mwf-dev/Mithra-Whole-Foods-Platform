import { Leaf } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { AISLES, Aisle, aisleHref, aisleProductIds } from "@modules/home/aisles"
import { AisleIllustration, hasIllustration } from "./aisle-illustrations"

/** Aisles with a photographic cut-out that floats free of the disc. */
const FLOATERS: Record<string, { src: string; alt: string }> = {
  ghee: { src: "/aisles/ghee.webp", alt: "Jar of pure cow ghee with fresh ghee in a wooden bowl" },
  podis: { src: "/aisles/podis.webp", alt: "Wooden bowl of red podi spice powder with chillies, turmeric and cinnamon" },
  "kids-flours": { src: "/aisles/kids-flours.webp", alt: "Bowl of grain flours with wheat ears and a bear-shaped scoop" },
  "health-mixes": { src: "/aisles/health-mixes.webp", alt: "Bowl of health mix with nuts, seeds, dried fruit and grains" },
  rice: { src: "/aisles/rice.webp", alt: "Bowl of white rice with rice ears and a sack" },
  oils: { src: "/aisles/oils.webp", alt: "Bottle of oil with sunflowers and groundnuts" },
  millets: { src: "/aisles/millets.webp", alt: "Bowl of millets with millet ears" },
  sweeteners: { src: "/aisles/sweeteners.webp", alt: "Bowl of jaggery blocks with sugarcane" },
  "sweets-snacks": { src: "/aisles/sweets-snacks.webp", alt: "Bowl of laddus, banana chips, murukku and nuts" },
  treats: { src: "/aisles/treats.webp", alt: "Traditional sweets on a banana leaf with coconut and nuts" },
  pantry: { src: "/aisles/pantry.webp", alt: "Bowl of dals and pulses" },
}

function FloatingDisc({
  index,
  art,
}: {
  index: number
  art: { src: string; alt: string }
}) {
  const delay = `${(index % 6) * -0.8}s`
  return (
    <div className="relative h-24 w-24 md:h-28 md:w-28">
      {/* Contact shadow on the "floor" under the disc: shrinks and fades as
          the product rises, so the float reads as depth, not a wobble. */}
      <span
        aria-hidden
        className="mithra-float-shadow pointer-events-none absolute -bottom-1 left-1/2 h-3 w-24 md:w-28 -translate-x-1/2 rounded-[50%] bg-charcoal/55 blur-[5px]"
        style={{ animationDelay: delay }}
      />
      <div className="absolute -top-7 left-1/2 w-[7.5rem] md:w-36 -translate-x-1/2 transition-transform duration-500 ease-out group-hover:-translate-y-2 group-hover:scale-105">
        <div className="mithra-float" style={{ animationDelay: delay }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={art.src}
            alt={art.alt}
            width={360}
            height={350}
            loading="lazy"
            decoding="async"
            className="h-auto w-full drop-shadow-[0_10px_8px_rgba(27,77,37,0.28)]"
          />
        </div>
      </div>
    </div>
  )
}

function Disc({ aisle, index }: { aisle: Aisle; index: number }) {
  const { world } = aisle
  const floater = FLOATERS[aisle.id]
  if (floater) return <FloatingDisc index={index} art={floater} />
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
      <ul className="no-scrollbar mx-auto flex w-max max-w-full snap-x snap-mandatory gap-5 md:gap-7 overflow-x-auto px-8 pt-12 pb-2 scroll-px-8">
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
