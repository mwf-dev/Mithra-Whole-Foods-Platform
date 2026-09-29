import { listProducts } from "@lib/data/products"
import { searchProductIds } from "@lib/data/search"
import { getRegion } from "@lib/data/regions"
import { sortProducts } from "@lib/util/sort-products"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import TrackEvent from "@lib/analytics/track-event"
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

  // The in-process search engine (apps/backend/src/lib/product-search.ts)
  // ranks the matches — typo-tolerant, relevance-ordered, with curated synonym
  // groups. Medusa then hydrates those ids with region-correct pricing.
  const { productIds, count } = await searchProductIds({
    q: query,
    limit: PRODUCT_LIMIT,
    offset: (page - 1) * PRODUCT_LIMIT,
  })

  if (count === 0 || productIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
        {/* Zero-result queries are the highest-value signal this store can
            collect: they say what to stock, and what to add to the backend's
            SYNONYM_GROUPS. Reported as its own event so it's trivially
            filterable, on top of the search_performed below. */}
        <TrackEvent
          name="search_performed"
          properties={{ query, result_count: 0 }}
        />
        <TrackEvent name="search_no_results" properties={{ query }} />
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

  // Hydrate the ranked ids with pricing. listProducts returns them in an
  // arbitrary order, so re-order to Meilisearch's relevance ranking — unless
  // the shopper explicitly chose a price sort.
  const {
    response: { products: hydrated },
  } = await listProducts({
    countryCode,
    queryParams: { id: productIds, limit: productIds.length } as any,
  })

  const byId = new Map(hydrated.map((p) => [p.id, p]))
  const orderedByRelevance = productIds
    .map((id) => byId.get(id))
    .filter((p): p is (typeof hydrated)[number] => Boolean(p))

  const products =
    sortBy === "price_asc" || sortBy === "price_desc"
      ? sortProducts(orderedByRelevance, sortBy)
      : orderedByRelevance

  const totalPages = Math.ceil(count / PRODUCT_LIMIT)

  return (
    <>
      <TrackEvent
        name="search_performed"
        properties={{ query, result_count: count }}
      />
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
