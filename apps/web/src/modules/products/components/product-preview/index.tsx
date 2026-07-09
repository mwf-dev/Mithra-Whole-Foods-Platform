import { Star } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductPrice } from "@lib/util/get-product-price"
import { safeCssUrl } from "@lib/util/safe-css-url"
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

  const price = cheapestPrice?.calculated_price_number || 0
  const originalPrice = cheapestPrice?.original_price_number || null
  const currencyCode = region.currency_code || "INR"

  const priceFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
  })

  const variantTitle = product.variants?.[0]?.title
  // "Default" is Medusa's auto-generated single-variant title — not a real size
  const weight = variantTitle && variantTitle !== "Default" ? variantTitle : null
  const img =
    product.thumbnail ||
    product.images?.[0]?.url ||
    "https://placehold.co/200x250/ffffff/d4d4d4?text=Product"
  const href = `/products/${product.handle}`
  const reviews = 10 // Dummy value until reviews exist

  const badge = product.tags
    ?.map((t) => BADGE_TAGS[t.value?.toLowerCase() ?? ""])
    .find(Boolean)

  const onSale = originalPrice != null && originalPrice > price

  return (
    <div className="bg-white rounded-2xl border border-beige p-4 shadow-card-sm hover:shadow-card-lg transition-all duration-300 flex flex-col group h-full">
      {/* Image */}
      <LocalizedClientLink
        href={href}
        className="relative aspect-[4/5] bg-cream rounded-xl mb-4 overflow-hidden flex items-center justify-center block"
      >
        <WishlistHeart title={product.title} />

        {(badge || onSale) && (
          <span className="absolute bottom-3 left-3 z-10 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
            {badge ?? "Sale"}
          </span>
        )}

        <div
          className="absolute inset-0 bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500 m-4"
          style={{ backgroundImage: `url('${safeCssUrl(img)}')` }}
          role="img"
          aria-label={product.title}
        ></div>
      </LocalizedClientLink>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-[#E8A93C]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-current" />
            ))}
          </div>
          <span className="text-[10px] text-grey-50">({reviews})</span>
        </div>

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
          <span className="text-lg font-bold text-charcoal">
            {priceFormatter.format(price)}
          </span>
          {onSale && (
            <span className="text-xs text-grey-40 line-through">
              {priceFormatter.format(originalPrice)}
            </span>
          )}
        </div>

        {/* Add to Cart */}
        <AddToCartButton
          variantId={product.variants?.[0]?.id}
          variantCount={product.variants?.length ?? 0}
          productHref={href}
        />
      </div>
    </div>
  )
}
