import { ArrowRight } from "lucide-react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"
import { groupBySize } from "@modules/products/components/product-preview/card-model"
import { AISLES, aisleProductIds } from "@modules/home/aisles"
import { RailTab, TabbedRail } from "./tabbed-rail"

const PER_RAIL = 10

/**
 * Tabs are aisle groups. There is deliberately no "Best sellers" or "New
 * arrivals" tab: the catalog has no sales ranking and was imported in one go,
 * so either label would be invented.
 */
const TAB_AISLES: { id: string; label: string; aisles: string[] }[] = [
  { id: "oils-ghee", label: "Oils & ghee", aisles: ["oils", "ghee"] },
  { id: "rice-millets", label: "Rice & millets", aisles: ["rice", "millets", "kids-flours"] },
  { id: "breakfast", label: "Breakfast mixes", aisles: ["health-mixes"] },
  { id: "sweets", label: "Sweets & sweeteners", aisles: ["sweets-snacks", "sweeteners"] },
]

export function ProductRail({
  products,
  region,
}: {
  products: HttpTypes.StoreProduct[]
  region: HttpTypes.StoreRegion
}) {
  const groups = groupBySize(products).slice(0, PER_RAIL)
  return (
    <ul
      data-rail
      className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 md:gap-5 overflow-x-auto px-6 pb-4 scroll-px-6 large:px-[calc((100vw-1440px)/2+1.5rem)] large:scroll-px-[calc((100vw-1440px)/2+1.5rem)]"
    >
      {groups.map((group) => (
        <li
          key={group[0].id}
          className="w-[66%] shrink-0 snap-start xsmall:w-[40%] md:w-[30%] small:w-[23%] medium:w-[18.5%]"
        >
          <ProductPreview product={group[0]} sizes={group} region={region} />
        </li>
      ))}
    </ul>
  )
}

/**
 * "Top picks": tabbed rails over the catalog, fed by the single product list
 * the homepage already fetches — no request per tab.
 */
export function TopPicks({
  products,
  categories,
  region,
}: {
  products: HttpTypes.StoreProduct[]
  categories: HttpTypes.StoreProductCategory[]
  region: HttpTypes.StoreRegion
}) {
  if (!products.length) {
    return null
  }

  const inAisles = (ids: string[]) => {
    const wanted = new Set<string>()
    AISLES.filter((a) => ids.includes(a.id)).forEach((a) =>
      aisleProductIds(a, categories).forEach((id) => wanted.add(id))
    )
    return products.filter((p) => wanted.has(p.id))
  }

  const tabs: RailTab[] = [
    { id: "all", label: "All", products },
    ...TAB_AISLES.map((t) => ({ id: t.id, label: t.label, products: inAisles(t.aisles) })),
  ]
    .filter((t) => t.products.length > 0)
    .map((t) => ({
      id: t.id,
      label: t.label,
      content: <ProductRail products={t.products} region={region} />,
    }))

  return (
    <TabbedRail
      eyebrow="Top picks"
      heading="Stock the pantry"
      tabs={tabs}
      viewAll={
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-all hover:gap-2"
        >
          View all <ArrowRight size={16} aria-hidden />
        </LocalizedClientLink>
      }
    />
  )
}
