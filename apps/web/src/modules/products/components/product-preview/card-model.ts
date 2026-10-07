import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import { isComingSoon } from "@lib/util/coming-soon"

/**
 * Plain, serialisable view of one product for the client-side card. Built on
 * the server so the client component never receives a full StoreProduct.
 */
export type CardItem = {
  id: string
  handle: string
  title: string
  /** e.g. "100 ml", "2 lbs" — parsed from the title; null when there is none. */
  size: string | null
  image: string | null
  /** Second gallery image, shown on hover. */
  hoverImage: string | null
  variantId?: string
  variantCount: number
  price: number
  originalPrice: number | null
  purchasable: boolean
  /** Announced but not buyable yet (unpriced, or tagged `coming-soon`). */
  comingSoon: boolean
  badge: string | null
  benefit: string | null
}

const BADGE_TAGS: Record<string, string> = {
  organic: "Organic",
  "best seller": "Best Seller",
  bestseller: "Best Seller",
  new: "New Arrival",
  "new arrival": "New Arrival",
}

// A pack size in a product title: "100ml", "2L", "10 lbs", "250g", "3.2 Oz".
const SIZE = /(\d+(?:\.\d+)?)\s*(ml|ltr|l|lbs?|kg|g|oz)\b/i

const UNIT_LABEL: Record<string, string> = {
  ml: "ml",
  l: "L",
  ltr: "L",
  lb: "lb",
  lbs: "lbs",
  kg: "kg",
  g: "g",
  oz: "oz",
}

/**
 * Splits "Sastra Pure Cow Ghee - 100ml (3.2 Oz)" into
 * { base: "Sastra Pure Cow Ghee", size: "100 ml" }. Titles without a size
 * come back whole with `size: null`.
 */
export function splitTitle(title: string): { base: string; size: string | null } {
  const match = SIZE.exec(title)
  if (!match || match.index === undefined) {
    return { base: title.trim(), size: null }
  }
  const unit = UNIT_LABEL[match[2].toLowerCase()] ?? match[2]
  const base = title
    .slice(0, match.index)
    // Drop the separator that introduced the size: " - ", " (", " |".
    .replace(/[\s\-–|(]+$/, "")
    .trim()
  return { base: base || title.trim(), size: `${match[1]} ${unit}` }
}

export function toCardItem(product: HttpTypes.StoreProduct): CardItem {
  const { cheapestPrice } = getProductPrice({ product })
  const comingSoon = isComingSoon(product)
  const images = (product.images ?? []).map((i) => i.url).filter(Boolean)
  const image = product.thumbnail || images[0] || null
  const hoverImage = images.find((u) => u !== image) ?? null
  const badge =
    product.tags
      ?.map((t) => BADGE_TAGS[t.value?.toLowerCase() ?? ""])
      .find(Boolean) ?? null
  const benefit =
    product.subtitle ||
    (typeof product.metadata?.benefit === "string"
      ? (product.metadata.benefit as string)
      : null)

  return {
    id: product.id!,
    handle: product.handle!,
    title: product.title!,
    size: splitTitle(product.title ?? "").size,
    image,
    hoverImage,
    variantId: product.variants?.[0]?.id,
    variantCount: product.variants?.length ?? 0,
    // A variant with no price in this region cannot be added to a cart —
    // Medusa rejects the line outright — so it is shown as unavailable rather
    // than as "$0" behind a button that is guaranteed to fail.
    price: cheapestPrice?.calculated_price_number || 0,
    originalPrice: cheapestPrice?.original_price_number ?? null,
    purchasable: !!cheapestPrice && !comingSoon,
    comingSoon,
    badge,
    benefit,
  }
}

/**
 * The catalog sells each pack size as its own product (three ghee products,
 * two sesame oils…). For rails, group those siblings so one card offers size
 * chips instead of three near-identical cards. Groups keep the input order of
 * their first member; members are sorted smallest price first.
 */
export function groupBySize(
  products: HttpTypes.StoreProduct[]
): HttpTypes.StoreProduct[][] {
  const groups = new Map<string, HttpTypes.StoreProduct[]>()
  for (const product of products) {
    const { base, size } = splitTitle(product.title ?? "")
    // Unsized products never merge — two "Assorted Sweets" are not sizes.
    const key = size ? base.toLowerCase() : `__${product.id}`
    const group = groups.get(key)
    if (group) {
      group.push(product)
    } else {
      groups.set(key, [product])
    }
  }
  return Array.from(groups.values()).map((group) =>
    group.length < 2
      ? group
      : [...group].sort(
          (a, b) =>
            (getProductPrice({ product: a }).cheapestPrice?.calculated_price_number ?? 0) -
            (getProductPrice({ product: b }).cheapestPrice?.calculated_price_number ?? 0)
        )
  )
}

/**
 * True when a product's first image is one of the studio card images — the
 * white-ground packshot made for the storefront cards (`card-<handle>-01`, or
 * `oil-<handle>-01` for the oils, whose renders come from the client's own jug
 * art). Rails use it to show only products whose card photo matches the rest,
 * instead of mixing in older scene photos or another brand's pack.
 */
export function hasStudioImage(product: HttpTypes.StoreProduct): boolean {
  const first = product.thumbnail || product.images?.[0]?.url || ""
  return /[/_](card|oil)-[a-z0-9-]+-01\.jpg/i.test(first)
}

/**
 * Stable sort that puts groups with something buyable ahead of groups that are
 * all "coming soon", so a rail does not open on a card with a disabled button.
 */
export function purchasableFirst(
  groups: HttpTypes.StoreProduct[][]
): HttpTypes.StoreProduct[][] {
  const live = (g: HttpTypes.StoreProduct[]) => g.some((p) => toCardItem(p).purchasable)
  return [...groups.filter(live), ...groups.filter((g) => !live(g))]
}
