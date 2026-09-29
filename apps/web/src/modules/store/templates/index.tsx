import { Suspense } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { listCategories } from "@lib/data/categories"
import { swallow } from "@lib/observability/report"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import MobileCategoryFilter from "@modules/store/components/refinement-list/mobile-category-filter"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = async ({
  sortBy,
  category,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  category?: string
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  const categories = await listCategories().catch(
    swallow([], "store.listCategories")
  )
  const topLevel = (categories ?? [])
    .filter((c) => !c.parent_category)
    .map((c) => ({ id: c.id, name: c.name, count: c.products?.length ?? 0 }))

  const activeCategory = topLevel.find((c) => c.id === category)
  const totalProducts = topLevel.reduce((acc, c) => acc + c.count, 0)

  return (
    <div className="py-8 content-container" data-testid="category-container">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar (Desktop only) */}
        <div className="hidden md:block w-[260px] shrink-0">
          <div className="border border-ui-border-base rounded-xl bg-white overflow-hidden shadow-sm sticky top-24">
            <LocalizedClientLink href="/store" className="block">
              <div className={`px-4 py-3 font-semibold transition-colors ${!category ? 'bg-[#2E5C31] text-white' : 'bg-[#F3F7F4] text-[#2E5C31] hover:bg-[#2E5C31] hover:text-white'}`}>
                All Items {totalProducts > 0 && `(${totalProducts})`}
              </div>
            </LocalizedClientLink>
            <ul className="divide-y divide-ui-border-base overflow-y-auto max-h-[calc(100vh-140px)]">
              {topLevel.map((c) => (
                <li key={c.id}>
                  <LocalizedClientLink 
                    href={`/store?category=${c.id}`}
                    className={`block px-4 py-3 text-sm transition-colors ${
                      category === c.id 
                        ? 'bg-[#F3F7F4] text-[#2E5C31] font-semibold border-l-4 border-[#2E5C31]' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                    }`}
                  >
                    {c.name} {c.count > 0 && `(${c.count})`}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-16 bg-[#FBF7F0] z-40 py-4 -mt-4 mb-6">
            <div>
              <h1
                data-testid="store-page-title"
                className="font-display text-3xl md:text-4xl text-ui-fg-base"
              >
                {activeCategory ? activeCategory.name : "All products"}
              </h1>
              <p className="text-ui-fg-subtle text-sm mt-1.5">
                Premium traditional foods, sourced directly from nature.
              </p>
            </div>
            <div className="flex items-center shrink-0 gap-2 sm:gap-4">
              <div className="md:hidden">
                <MobileCategoryFilter categories={topLevel} activeId={category} />
              </div>
              <RefinementList sortBy={sort} />
            </div>
          </div>

          <Suspense
            key={`${activeCategory?.id ?? "all"}-${sort}-${pageNumber}`}
            fallback={<SkeletonProductGrid />}
          >
            <PaginatedProducts
              sortBy={sort}
              page={pageNumber}
              categoryId={activeCategory?.id}
              countryCode={countryCode}
            />
          </Suspense>
        </div>

      </div>
    </div>
  )
}

export default StoreTemplate
