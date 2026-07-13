"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { ChevronDown } from "lucide-react"

import { SortOptions } from "./sort-products"

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Latest arrivals" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
]

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  "data-testid"?: string
}

/**
 * Compact sort control that lives in the listing's top bar (not a left
 * sidebar) so the product grid can run full-width. Pushes the chosen sort
 * order into the URL query so the server component re-fetches sorted results.
 */
const RefinementList = ({
  sortBy,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setQueryParams = useCallback(
    (value: SortOptions) => {
      const params = new URLSearchParams(searchParams)
      params.set("sortBy", value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  return (
    <div className="flex items-center gap-2" data-testid={dataTestId}>
      <label
        htmlFor="sort-by"
        className="text-sm text-ui-fg-subtle whitespace-nowrap"
      >
        Sort by
      </label>
      <div className="relative">
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => setQueryParams(e.target.value as SortOptions)}
          className="appearance-none bg-white border border-ui-border-base rounded-full pl-4 pr-9 py-2 text-sm font-medium text-ui-fg-base cursor-pointer hover:border-[#2E5C31] focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/30 transition-colors"
          data-testid="sort-by-select"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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

export default RefinementList
