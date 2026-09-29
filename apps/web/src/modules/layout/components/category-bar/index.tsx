"use client"

import { HttpTypes } from "@medusajs/types"
import { Menu } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { usePathname } from "next/navigation"

/**
 * Desktop category bar — the second header row. Replaces the old slide-out
 * left "Menu" popover as the primary navigation: a "Shop All" pill plus the
 * store's real top-level categories, laid out horizontally like the reference
 * grocery storefronts. Hidden on mobile, where the hamburger menu takes over.
 * Hidden on the Store page where the dedicated left sidebar takes over.
 */
export default function CategoryBar({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  const pathname = usePathname()

  if (pathname?.includes("/store")) {
    return null
  }

  return (
    <div className="hidden md:block border-b border-ui-border-base bg-white/95 backdrop-blur">
      <div className="content-container flex items-center gap-6 h-12">
        <LocalizedClientLink
          href="/store"
          className="flex items-center gap-2 bg-[#F3F7F4] text-[#2E5C31] px-4 py-2 rounded-md font-semibold text-[14px] hover:bg-[#E3EEE6] transition-colors shrink-0"
          data-testid="nav-shop-all-link"
        >
          <Menu size={18} strokeWidth={2.2} />
          Shop by Category
        </LocalizedClientLink>

        <nav className="flex-1 flex items-center gap-7 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <LocalizedClientLink
              key={category.id}
              href={`/categories/${category.handle}`}
              className="text-[13px] font-medium text-ui-fg-subtle whitespace-nowrap hover:text-[#2E5C31] transition-colors"
            >
              {category.name}
            </LocalizedClientLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
