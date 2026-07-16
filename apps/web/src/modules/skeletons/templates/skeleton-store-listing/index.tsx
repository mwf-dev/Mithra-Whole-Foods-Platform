import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"

/**
 * Shared listing skeleton for /store, /categories/* and /collections/* — a
 * title + sort top bar above the full-width product grid. Rendered by each
 * route's loading.tsx so navigation paints instantly instead of blocking on
 * the product fetch.
 */
const SkeletonStoreListing = () => {
  return (
    <div className="py-8 content-container animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <div className="h-9 w-48 bg-gray-200 rounded" />
          <div className="h-3 w-64 bg-gray-100 rounded mt-3" />
        </div>
        <div className="h-10 w-52 bg-gray-100 rounded-full" />
      </div>
      <SkeletonProductGrid />
    </div>
  )
}

export default SkeletonStoreListing
