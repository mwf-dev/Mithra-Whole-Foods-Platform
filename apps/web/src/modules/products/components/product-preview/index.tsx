import { Leaf } from "lucide-react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import AddToCartButton from "./add-to-cart-button"
import WishlistHeart from "./wishlist-heart"

const BADGE_TAGS: Record<string, string> = {
  organic: "Organic",
  "best seller": "Best Seller",
  bestseller: "Best Seller",
  new: "New Arrival",
  "new arrival": "New Arrival",
}

export default function ProductPreview({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  // A variant with no price in this region cannot be added to a cart — Medusa
  // rejects the line item outright. Treat those as unavailable rather than
  // rendering a "$0" tile behind a button that is guaranteed to fail.
  const isPurchasable = !!cheapestPrice
  const price = cheapestPrice?.calculated_price_number || 0
  const originalPrice = cheapestPrice?.original_price_number || null
  const currencyCode = region.currency_code || "USD"

  const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  })

  const variantTitle = product.variants?.[0]?.title
  // "Default" is Medusa's auto-generated single-variant title — not a real size
  const weight = variantTitle && variantTitle !== "Default" ? variantTitle : null
  // Real image only — no external placeholder service. Falls back to an
  // on-brand tile below so cards never render blank while a photo is missing.
  const img = product.thumbnail || product.images?.[0]?.url || null
  const href = `/products/${product.handle}`

  const badge = product.tags
    ?.map((t) => BADGE_TAGS[t.value?.toLowerCase() ?? ""])
    .find(Boolean)

  const onSale = originalPrice != null && originalPrice > price

  return (
    <div className="bg-white rounded-2xl border border-beige p-4 shadow-card-sm hover:shadow-card-lg transition-all duration-300 flex flex-col group h-full">
      {/* Image */}
      <LocalizedClientLink
        href={href}
        className="relative aspect-[4/5] bg-[#F4EFE6] rounded-xl mb-4 overflow-hidden flex items-center justify-center block"
      >
        <WishlistHeart title={product.title} handle={product.handle} />

        {(badge || onSale) && (
          <span className="absolute bottom-3 left-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {badge ?? "Sale"}
          </span>
        )}

        {/* next/image (not a CSS background) so cards get AVIF/WebP,
            responsive srcset and lazy-loading out of the box. */}
        {img ? (
          <Image
            src={img}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            quality={60}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-primary/25">
            <Leaf className="w-9 h-9" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-grey-40">
              Mithra
            </span>
          </div>
        )}
      </LocalizedClientLink>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Title & Weight */}
        <LocalizedClientLink href={href} className="flex-1 mb-2">
          <h4 className="font-semibold text-charcoal leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2 text-sm">
            {product.title}
          </h4>
          {weight && (
            <span className="text-[11px] text-grey-50">{weight}</span>
          )}
        </LocalizedClientLink>

        {/* Price */}
        <div className="mb-4 flex items-baseline gap-2">
          {isPurchasable ? (
            <>
              <span className="text-lg font-bold text-charcoal">
                {priceFormatter.format(price)}
              </span>
              {onSale && (
                <span className="text-xs text-grey-40 line-through">
                  {priceFormatter.format(originalPrice)}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-grey-50">
              Price unavailable
            </span>
          )}
        </div>

        {/* Add to Cart */}
        {isPurchasable ? (
          <AddToCartButton
            variantId={product.variants?.[0]?.id}
            variantCount={product.variants?.length ?? 0}
            productHref={href}
            title={product.title}
            thumbnail={product.thumbnail || product.images?.[0]?.url || null}
            unitPrice={price}
          />
        ) : (
          <button
            disabled
            className="w-full bg-grey-5 text-grey-40 py-2.5 rounded-lg text-xs font-semibold cursor-not-allowed border border-beige"
          >
            Currently unavailable
          </button>
        )}
      </div>
    </div>
  )
}
