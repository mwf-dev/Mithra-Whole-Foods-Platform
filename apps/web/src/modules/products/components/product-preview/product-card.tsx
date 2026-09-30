"use client"

import { useState } from "react"
import Image from "next/image"
import { Leaf } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Tilt from "@modules/common/components/tilt"
import AddToCartButton from "./add-to-cart-button"
import WishlistHeart from "./wishlist-heart"
import { CardItem } from "./card-model"

/**
 * Product card. One card can hold several pack sizes of the same product
 * (`items`, smallest first): the size chips swap image, price, link and the
 * add-to-cart target in place — no navigation, no backend call.
 *
 * Hovering shows the product's second gallery image when it has one; a card
 * without one simply doesn't swap.
 */
export default function ProductCard({
  items,
  currencyCode,
  title,
}: {
  items: CardItem[]
  currencyCode: string
  /** Display name for a size group (the title minus its size). */
  title?: string
}) {
  const [selected, setSelected] = useState(0)
  const item = items[Math.min(selected, items.length - 1)]
  const href = `/products/${item.handle}`
  const grouped = items.length > 1

  const format = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
    }).format(n)

  const onSale = item.originalPrice != null && item.originalPrice > item.price
  const badge = item.comingSoon
    ? "Coming soon"
    : item.badge ?? (onSale ? "Sale" : grouped ? `${items.length} sizes` : null)
  const name = grouped ? title ?? item.title : item.title

  return (
    <Tilt
      shine
      className="group flex h-full flex-col overflow-hidden rounded-large border border-beige bg-white shadow-card-sm hover:shadow-card-xl"
    >
      <LocalizedClientLink
        href={href}
        className="relative block aspect-square overflow-hidden bg-beige"
      >
        <WishlistHeart key={item.handle} title={item.title} handle={item.handle} />

        {badge && (
          <span className="absolute left-3 top-3 z-10 rounded-base bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal shadow-card-sm">
            {badge}
          </span>
        )}

        {item.image ? (
          <>
            <Image
              key={item.image}
              src={item.image}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
              quality={60}
              className={`object-cover transition-all duration-500 group-hover:scale-105 ${
                item.hoverImage ? "group-hover:opacity-0" : ""
              }`}
            />
            {item.hoverImage && (
              <Image
                src={item.hoverImage}
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                quality={60}
                className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-primary/25">
            <Leaf className="h-9 w-9" strokeWidth={1.5} aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-grey-40">
              Mithra
            </span>
          </div>
        )}
      </LocalizedClientLink>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <LocalizedClientLink href={href} className="flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-charcoal transition-colors group-hover:text-primary">
            {name}
          </h3>
          {item.benefit ? (
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-grey-50">
              {item.benefit}
            </p>
          ) : (
            !grouped &&
            item.size && <p className="mt-1 text-xs text-grey-50">{item.size}</p>
          )}
        </LocalizedClientLink>

        {grouped && (
          <div role="radiogroup" aria-label="Pack size" className="flex flex-wrap gap-1.5">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                role="radio"
                aria-checked={i === selected}
                onClick={() => setSelected(i)}
                className={`min-h-[32px] rounded-rounded border px-2.5 text-xs font-semibold transition-colors ${
                  i === selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-beige text-charcoal hover:border-primary/50"
                }`}
              >
                {it.size ?? it.title}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-baseline gap-2" aria-live="polite">
          {item.purchasable ? (
            <>
              <span className="text-lg font-bold tabular-nums text-charcoal">
                {format(item.price)}
              </span>
              {onSale && (
                <span className="text-xs text-grey-40 line-through tabular-nums">
                  {format(item.originalPrice!)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-grey-50">
              {item.comingSoon ? "Launching soon" : "Price unavailable"}
            </span>
          )}
        </div>

        {item.purchasable ? (
          <AddToCartButton
            key={item.id}
            variantId={item.variantId}
            variantCount={item.variantCount}
            productHref={href}
            title={item.title}
            thumbnail={item.image}
            unitPrice={item.price}
          />
        ) : (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-beige bg-grey-5 py-2.5 text-xs font-semibold text-grey-40"
          >
            {item.comingSoon ? "Coming soon" : "Currently unavailable"}
          </button>
        )}
      </div>
    </Tilt>
  )
}
