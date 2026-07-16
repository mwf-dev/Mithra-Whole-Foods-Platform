"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useState } from "react"
import { Filter } from "lucide-react"

export type CategoryOption = {
  id: string
  name: string
  count?: number
}

type MobileCategoryFilterProps = {
  categories: CategoryOption[]
  activeId?: string
}

const MobileCategoryFilter = ({ categories, activeId }: MobileCategoryFilterProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)

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
      setIsOpen(false)
    },
    [searchParams, pathname, router]
  )

  const activeCategory = categories.find(c => c.id === activeId)

  return (
    <div className="flex items-center relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center gap-2 bg-white border border-ui-border-base rounded-full px-4 py-2 text-sm font-medium text-ui-fg-base cursor-pointer hover:border-[#2E5C31] focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/30 transition-colors"
      >
        <Filter size={16} className={activeId ? "text-[#2E5C31]" : "text-ui-fg-subtle"} />
        <span className="hidden sm:inline">
          {activeCategory ? activeCategory.name : "Categories"}
        </span>
        <span className="sm:hidden">
          {activeCategory ? "Filtered" : "Filter"}
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-ui-border-base rounded-xl shadow-card-lg z-20 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[50vh]">
            <div className="overflow-y-auto overscroll-contain">
              <button
                onClick={() => setCategory("")}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-[#F3F7F4] transition-colors ${
                  !activeId ? "text-[#2E5C31] font-semibold bg-[#F3F7F4]/50" : "text-ui-fg-base"
                }`}
              >
                All Items
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-[#F3F7F4] transition-colors ${
                    activeId === c.id ? "text-[#2E5C31] font-semibold bg-[#F3F7F4]/50" : "text-ui-fg-base"
                  }`}
                >
                  {c.name} {c.count !== undefined && c.count > 0 && `(${c.count})`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MobileCategoryFilter
