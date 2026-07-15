import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import CategoryFilter from "@modules/store/components/refinement-list/category-filter"
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

  const categories = await listCategories().catch(() => [])
  const topLevel = (categories ?? [])
    .filter((c) => !c.parent_category && (c.products?.length ?? 0) > 0)
    .map((c) => ({ id: c.id, name: c.name }))

  const activeCategory = topLevel.find((c) => c.id === category)

  return (
    <div className="py-8 content-container" data-testid="category-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
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
        <div className="flex flex-wrap items-center gap-3">
          <CategoryFilter categories={topLevel} activeId={activeCategory?.id} />
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
  )
}

export default StoreTemplate
