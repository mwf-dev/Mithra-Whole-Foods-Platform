import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { safeCssUrl } from "@lib/util/safe-css-url"
import {
  HomepageCategoryTile,
  resolveBackendImage,
} from "@lib/data/homepage"

/**
 * Admin-managed circular category tiles ("Shop by category") shown under
 * the hero. Hidden when no tiles are configured.
 */
export function CategoryTiles({
  tiles,
}: {
  tiles?: HomepageCategoryTile[] | null
}) {
  const items = (tiles ?? []).filter((t) => t.name || t.image_url)

  if (items.length === 0) {
    return null
  }

  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair mb-8">
          Shop by Category
        </h2>
        <div className="flex gap-6 md:gap-10 overflow-x-auto no-scrollbar pb-2">
          {items.map((tile, i) => (
            <LocalizedClientLink
              key={i}
              href={tile.link || "/store"}
              className="flex flex-col items-center gap-3 shrink-0 group"
            >
              <div
                className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-[#F3F7F4] bg-cover bg-center border border-gray-100 group-hover:border-[#2E5C31] group-hover:shadow-md transition-all"
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
              <span className="text-sm font-semibold text-gray-800 group-hover:text-[#2E5C31] transition-colors text-center">
                {tile.name}
              </span>
            </LocalizedClientLink>
          ))}
        </div>
      </div>
    </section>
  )
}
