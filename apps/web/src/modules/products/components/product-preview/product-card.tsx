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
  variant = "default",
}: {
  items: CardItem[]
  currencyCode: string
  /** Display name for a size group (the title minus its size). */
  title?: string
  /**
   * `rail` is the homepage "Stock the pantry" card: white image ground, the
   * body sans-serif instead of the display serif that `h3` inherits, and larger
   * type throughout. Every other grid keeps `default`.
   */
  variant?: "default" | "rail"
}) {
  const rail = variant === "rail"
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

  const t = rail
    ? {
        body: "gap-3 p-5",
        title: "font-sans text-lg font-semibold leading-snug tracking-tight",
        sub: "mt-1.5 text-sm leading-snug",
        chip: "min-h-[38px] px-3 text-sm",
        price: "font-sans text-2xl font-bold",
        was: "text-sm",
        soon: "text-base",
        badge: "text-[11px]",
        button: "py-3 text-sm",
      }
    : {
        body: "gap-2 p-4",
        title: "text-sm font-semibold leading-snug",
        sub: "mt-1 text-xs leading-snug",
        chip: "min-h-[32px] px-2.5 text-xs",
        price: "text-lg font-bold",
        was: "text-xs",
        soon: "text-sm",
        badge: "text-[10px]",
        button: "py-2.5 text-xs",
      }

  return (
    <Tilt
      shine
      className="group flex h-full flex-col overflow-hidden rounded-large border border-beige bg-white shadow-card-sm hover:shadow-card-xl"
    >
      <LocalizedClientLink
        href={href}
        className={`relative block aspect-square overflow-hidden ${rail ? "bg-white" : "bg-beige"}`}
      >
        <WishlistHeart key={item.handle} title={item.title} handle={item.handle} />

        {badge && (
          <span className={`absolute left-3 top-3 z-10 rounded-base bg-white/95 px-2 py-1 ${t.badge} font-bold uppercase tracking-wider text-charcoal shadow-card-sm`}>
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

      <div className={`flex flex-1 flex-col ${t.body}`}>
        <LocalizedClientLink href={href} className="flex-1">
          <h3 className={`line-clamp-2 ${t.title} text-charcoal transition-colors group-hover:text-primary`}>
            {name}
          </h3>
          {item.benefit ? (
            <p className={`line-clamp-2 ${t.sub} text-grey-50`}>
              {item.benefit}
            </p>
          ) : (
            !grouped &&
            item.size && <p className={`${t.sub} text-grey-50`}>{item.size}</p>
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
                className={`${t.chip} rounded-rounded border font-semibold transition-colors ${
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
              <span className={`${t.price} tabular-nums text-charcoal`}>
                {format(item.price)}
              </span>
              {onSale && (
                <span className={`${t.was} text-grey-40 line-through tabular-nums`}>
                  {format(item.originalPrice!)}
                </span>
              )}
            </>
          ) : (
            <span className={`${t.soon} font-medium text-grey-50`}>
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
            large={rail}
          />
        ) : (
          <button
            disabled
            className={`w-full cursor-not-allowed rounded-lg border border-beige bg-grey-5 ${t.button} font-semibold text-grey-40`}
          >
            {item.comingSoon ? "Coming soon" : "Currently unavailable"}
          </button>
        )}
      </div>
    </Tilt>
  )
}
