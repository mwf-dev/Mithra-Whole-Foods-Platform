import LocalizedClientLink from '@modules/common/components/localized-client-link';
import { HttpTypes } from '@medusajs/types';
import { Menu } from 'lucide-react';

/**
 * Slim category strip under the header. Uses the store's real categories
 * (top-level only) and links to their category pages.
 */
export function CategoryNav({
  categories,
}: {
  categories?: HttpTypes.StoreProductCategory[] | null
}) {
  const topLevel = (categories ?? []).filter((c) => !c.parent_category)

  if (topLevel.length === 0) {
    return null
  }

  return (
    <div className="border-b border-gray-100 bg-white hidden md:block">
      <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-8">

        {/* Shop by Category Button */}
        <LocalizedClientLink
          href="/store"
          className="flex items-center gap-2 bg-[#F3F7F4] text-[#2E5C31] px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#E8F0EA] transition-colors flex-shrink-0"
        >
          <Menu size={18} />
          Shop by Category
        </LocalizedClientLink>

        {/* Category Links */}
        <nav className="flex-1 flex items-center overflow-x-auto no-scrollbar gap-8">
          {topLevel.slice(0, 8).map((category) => (
            <LocalizedClientLink
              key={category.id}
              href={`/categories/${category.handle}`}
              className="text-gray-700 font-semibold text-sm whitespace-nowrap hover:text-[#2E5C31] transition-colors"
            >
              {category.name}
            </LocalizedClientLink>
          ))}
        </nav>

      </div>
    </div>
  );
}
