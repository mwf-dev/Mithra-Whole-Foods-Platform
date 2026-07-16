import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import SearchResults from "./search-results"

const SearchTemplate = ({
  query,
  sortBy,
  page,
  countryCode,
}: {
  query: string
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const q = (query || "").trim()

  return (
    <div className="py-8 content-container" data-testid="search-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1
            data-testid="search-page-title"
            className="font-display text-3xl md:text-4xl text-ui-fg-base"
          >
            {q ? <>Results for “{q}”</> : "Search"}
          </h1>
          <p className="text-ui-fg-subtle text-sm mt-1.5">
            {q
              ? "Products matching your search."
              : "Type in the bar above to find products."}
          </p>
        </div>
        {q && <RefinementList sortBy={sort} />}
      </div>

      {q ? (
        <Suspense
          key={`${q}-${sort}-${pageNumber}`}
          fallback={<SkeletonProductGrid />}
        >
          <SearchResults
            query={q}
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

export default SearchTemplate
