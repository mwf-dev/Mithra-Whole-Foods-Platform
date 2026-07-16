import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { safeCssUrl } from "@lib/util/safe-css-url"
import {
  HomepageCategoryTile,
  resolveBackendImage,
} from "@lib/data/homepage"
import { Leaf } from "lucide-react"

/**
 * Admin-managed circular category tiles ("Shop by category") shown under
 * the hero. Hidden when no tiles are configured.
 */
export function CategoryTiles({
  tiles,
  categories = [],
}: {
  tiles?: HomepageCategoryTile[] | null
  categories?: any[]
}) {
  const items = (tiles ?? []).filter((t) => t.name || t.image_url)

  if (items.length === 0) {
    return null
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col items-center text-center mb-10">
          <Leaf className="w-5 h-5 text-[#8db162] mb-2" strokeWidth={2} />
          <h2 className="text-2xl md:text-3xl font-bold text-[#1f291e] font-playfair mb-2">
            Shop by Category
          </h2>
          <p className="text-gray-500 text-sm md:text-base">
            Explore our wide range of traditional and natural foods
          </p>
        </div>
        
        <div className="flex gap-6 md:gap-10 overflow-x-auto no-scrollbar pb-4 md:justify-center">
          {items.map((tile, i) => {
            const matchingCategory = categories?.find(
              (c) => c.name?.toLowerCase() === tile.name?.toLowerCase()
            )
            const count = matchingCategory?.products?.length || 0

            return (
              <LocalizedClientLink
                key={i}
                href={tile.link || "/store"}
                className="flex flex-col items-center shrink-0 group"
              >
                <div
                  className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-[#F3F7F4] bg-cover bg-center border border-gray-100 group-hover:border-[#2E5C31] group-hover:shadow-md transition-all mb-3"
                  style={
                    tile.image_url
                      ? {
                          backgroundImage: `url('${safeCssUrl(
                            resolveBackendImage(tile.image_url)
                          )}')`,
                        }
                      : undefined
                  }
                  role="img"
                  aria-label={tile.name || "Category"}
                />
                <span className="text-[15px] font-semibold text-gray-800 group-hover:text-[#2E5C31] transition-colors text-center">
                  {tile.name}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {count === 1 ? "1 Product" : `${count} Products`}
                </span>
              </LocalizedClientLink>
            )
          })}
        </div>
      </div>
    </section>
  )
}
