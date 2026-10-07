import { HttpTypes } from "@medusajs/types"
import ProductCard from "./product-card"
import { splitTitle, toCardItem } from "./card-model"

/**
 * Product card for grids and rails. Pass `sizes` (the product and its sibling
 * pack sizes, smallest first — see `groupBySize`) to render one card with size
 * chips; otherwise it is a plain single-product card.
 */
export default function ProductPreview({
  product,
  region,
  sizes,
  variant,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  sizes?: HttpTypes.StoreProduct[]
  /** `rail` = the larger, sans-serif card used by the homepage "Stock the pantry" rail. */
  variant?: "default" | "rail"
}) {
  const members = sizes && sizes.length > 1 ? sizes : [product]

  return (
    <ProductCard
      items={members.map(toCardItem)}
      currencyCode={region.currency_code || "USD"}
      title={members.length > 1 ? splitTitle(product.title ?? "").base : undefined}
      variant={variant}
    />
  )
}
