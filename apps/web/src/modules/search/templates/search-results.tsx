import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SearchX } from "lucide-react"

const PRODUCT_LIMIT = 12

export default async function SearchResults({
  query,
  sortBy,
  page,
  countryCode,
}: {
  query: string
  sortBy?: SortOptions
  page: number
  countryCode: string
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams: {
      limit: PRODUCT_LIMIT,
      // Free-text search handled by the Medusa store products endpoint.
      q: query,
    } as any,
    sortBy,
    countryCode,
  })

  if (count === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        <div className="bg-[#F3F7F4] text-[#2E5C31] rounded-full p-5">
          <SearchX size={32} strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-charcoal">
            No results for “{query}”
          </h2>
          <p className="text-ui-fg-subtle text-sm mt-1.5 max-w-md">
            Try a different spelling or a broader term — like “oil”, “millet”
            or “ghee”. You can also browse the full range.
          </p>
        </div>
        <LocalizedClientLink
          href="/store"
          className="mt-2 inline-flex items-center rounded-full bg-[#2E5C31] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#244a27] transition-colors"
        >
          Browse all products
        </LocalizedClientLink>
      </div>
    )
  }

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      <p className="text-ui-fg-subtle text-sm mb-6" aria-live="polite">
        {count} result{count === 1 ? "" : "s"}
      </p>
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 medium:grid-cols-4 gap-x-6 gap-y-8"
        data-testid="search-results-list"
      >
        {products.map((p) => (
          <li key={p.id}>
            <ProductPreview product={p} region={region} />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="search-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
