"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { ChevronDown } from "lucide-react"

export type CategoryOption = {
  id: string
  name: string
}

type CategoryFilterProps = {
  categories: CategoryOption[]
  activeId?: string
}

/**
 * In-listing category filter that sits in the top bar next to Sort (no left
 * sidebar, so the grid stays full-width). Writes the chosen category id to the
 * `category` query param; empty value = all products. Resets pagination.
 */
const CategoryFilter = ({ categories, activeId }: CategoryFilterProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setCategory = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) {
        params.set("category", value)
      } else {
        params.delete("category")
      }
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="category-filter"
        className="text-sm text-ui-fg-subtle whitespace-nowrap"
      >
        Category
      </label>
      <div className="relative">
        <select
          id="category-filter"
          value={activeId ?? ""}
          onChange={(e) => setCategory(e.target.value)}
          className="appearance-none bg-white border border-ui-border-base rounded-full pl-4 pr-9 py-2 text-sm font-medium text-ui-fg-base cursor-pointer hover:border-[#2E5C31] focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/30 transition-colors"
          data-testid="category-filter-select"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ui-fg-subtle"
        />
      </div>
    </div>
  )
}

export default CategoryFilter
