"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
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
  const [isOpen, setIsOpen] = useState(false)

  const setQueryParams = useCallback(
    (value: SortOptions) => {
      const params = new URLSearchParams(searchParams)
      params.set("sortBy", value)
      router.push(`${pathname}?${params.toString()}`)
      setIsOpen(false)
    },
    [searchParams, pathname, router]
  )

  const selectedOption = sortOptions.find((o) => o.value === sortBy) || sortOptions[0]

  return (
    <div className="flex items-center gap-3 relative" data-testid={dataTestId}>
      <span className="text-sm font-medium text-ui-fg-subtle whitespace-nowrap">
        Sort by
      </span>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-48 bg-white border border-ui-border-base rounded-full px-4 py-2 text-sm font-medium text-ui-fg-base cursor-pointer hover:border-[#2E5C31] focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/30 transition-colors"
        >
          <span>{selectedOption.label}</span>
          <ChevronDown
            size={16}
            className={`text-ui-fg-subtle transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white border border-ui-border-base rounded-xl shadow-card-lg z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setQueryParams(option.value)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F3F7F4] transition-colors ${
                    sortBy === option.value ? "text-[#2E7D32] font-semibold bg-[#F3F7F4]/50" : "text-ui-fg-base"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default RefinementList
