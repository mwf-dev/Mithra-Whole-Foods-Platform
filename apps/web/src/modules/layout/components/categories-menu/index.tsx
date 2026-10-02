"use client"

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { ChevronDown, LayoutGrid } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * "All Categories" dropdown in the header's primary row. Replaces the old
 * second-row category bar: the homepage aisle discs already show every aisle,
 * so the bar was duplicating them — this keeps one-click category access on
 * every page without the extra row.
 */
export default function CategoriesMenu({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  if (!categories.length) return null

  return (
    <Popover className="relative">
      <PopoverButton
        className="group flex items-center gap-1.5 rounded-rounded py-1 text-sm font-medium text-ui-fg-subtle outline-none transition-colors hover:text-primary data-[open]:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        data-testid="nav-categories-button"
      >
        <LayoutGrid size={16} strokeWidth={2} aria-hidden />
        All Categories
        <ChevronDown
          size={14}
          aria-hidden
          className="transition-transform group-data-[open]:rotate-180"
        />
      </PopoverButton>

      <PopoverPanel
        transition
        anchor={{ to: "bottom start", gap: 18 }}
        className="z-[60] w-[min(36rem,calc(100vw-2rem))] rounded-large border border-beige bg-white p-3 shadow-card-lg transition duration-150 ease-out data-[closed]:-translate-y-1 data-[closed]:opacity-0"
        data-testid="nav-categories-panel"
      >
        {({ close }) => (
          <>
            <ul className="grid grid-cols-2 gap-0.5 sm:grid-cols-3">
              {categories.map((category) => (
                <li key={category.id}>
                  <LocalizedClientLink
                    href={`/categories/${category.handle}`}
                    onClick={() => close()}
                    className="block rounded-base px-3 py-2 text-sm text-charcoal transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {category.name}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
            <div className="mt-2 border-t border-beige px-3 pt-3">
              <LocalizedClientLink
                href="/store"
                onClick={() => close()}
                className="text-sm font-semibold text-primary hover:underline"
              >
                View all products →
              </LocalizedClientLink>
            </div>
          </>
        )}
      </PopoverPanel>
    </Popover>
  )
}
