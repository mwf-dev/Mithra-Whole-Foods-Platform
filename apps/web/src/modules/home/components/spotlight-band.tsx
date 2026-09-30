import Image from "next/image"
import { ArrowRight } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  groupBySize,
  splitTitle,
  toCardItem,
} from "@modules/products/components/product-preview/card-model"
import { Aisle, aisleHref } from "@modules/home/aisles"

const MAX_ITEMS = 4

/**
 * Full-colour band for one aisle: its hero scene on one side, what the aisle
 * is on the other, and its products as small chips. Bands alternate sides down
 * the page (`flip`). While an aisle's products are not in the catalog yet the
 * chips show the upcoming packs, marked as such, and link nowhere.
 */
export function SpotlightBand({
  aisle,
  products,
  region,
  flip = false,
}: {
  aisle: Aisle
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
  flip?: boolean
}) {
  const spotlight = aisle.spotlight
  if (!spotlight) return null

  const { world } = aisle
  const format = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: region.currency_code || "USD",
      minimumFractionDigits: 0,
    }).format(n)

  const groups = groupBySize(products).slice(0, MAX_ITEMS)
  const upcoming = groups.length === 0 ? spotlight.comingSoon ?? [] : []

  return (
    <section className="content-container py-5 md:py-6">
      <div
        className={`mithra-reveal grid overflow-hidden rounded-large md:grid-cols-2 ${
          flip ? "md:[&>*:first-child]:order-2" : ""
        }`}
        style={{ backgroundColor: world.bg, color: world.ink }}
      >
        <div className="flex flex-col justify-center gap-5 p-7 md:p-10 lg:p-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">
            {spotlight.eyebrow}
          </p>
          <h2 className="font-display text-3xl leading-[1.04] md:text-4xl lg:text-[2.75rem] text-balance">
            {spotlight.headline}
          </h2>
          <ul className="flex flex-col gap-2 text-[15px]">
            {spotlight.points.map((point) => (
              <li key={point} className="flex gap-3">
                <span
                  aria-hidden
                  className="mt-2 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: "currentColor", opacity: 0.55 }}
                />
                {point}
              </li>
            ))}
          </ul>

          {(groups.length > 0 || upcoming.length > 0) && (
            <ul className="flex flex-wrap gap-2">
              {groups.map((group) => {
                const first = toCardItem(group[0])
                const name = group.length > 1 ? splitTitle(first.title).base : first.title
                return (
                  <li key={first.id}>
                    <LocalizedClientLink
                      href={`/products/${first.handle}`}
                      className="flex items-center gap-2.5 rounded-rounded bg-black/15 py-1.5 pl-1.5 pr-3 text-[13px] font-semibold transition-colors hover:bg-black/25"
                    >
                      {first.image && (
                        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-base bg-white">
                          <Image src={first.image} alt="" fill sizes="40px" quality={50} className="object-cover" />
                        </span>
                      )}
                      <span className="leading-tight">
                        <span className="line-clamp-1 max-w-[12rem]">{name}</span>
                        {first.purchasable && (
                          <span className="block text-xs font-medium opacity-80">
                            {group.length > 1 ? `${group.length} sizes from ` : ""}
                            {format(first.price)}
                          </span>
                        )}
                      </span>
                    </LocalizedClientLink>
                  </li>
                )
              })}
              {upcoming.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center gap-2.5 rounded-rounded bg-black/15 py-1.5 pl-1.5 pr-3 text-[13px] font-semibold"
                >
                  <span className="relative h-10 w-8 shrink-0">
                    <Image src={item.image} alt="" fill sizes="32px" quality={50} className="object-contain" />
                  </span>
                  <span className="leading-tight">
                    {item.name}
                    <span className="block text-xs font-medium opacity-80">Launching soon</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <LocalizedClientLink
            href={aisleHref(aisle)}
            className="inline-flex w-max items-center gap-2 rounded-rounded px-5 py-3 text-sm font-semibold text-white transition-transform hover:translate-x-0.5"
            style={{ backgroundColor: world.deep }}
          >
            Shop {aisle.name.toLowerCase()} <ArrowRight size={16} aria-hidden />
          </LocalizedClientLink>
        </div>

        <div className="relative min-h-[16rem] md:min-h-[26rem]" style={{ backgroundColor: world.deep }}>
          <Image
            src={spotlight.image}
            alt={spotlight.imageAlt}
            fill
            loading="lazy"
            quality={75}
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            style={{ objectPosition: spotlight.imagePosition ?? "50% 50%" }}
          />
        </div>
      </div>
    </section>
  )
}
