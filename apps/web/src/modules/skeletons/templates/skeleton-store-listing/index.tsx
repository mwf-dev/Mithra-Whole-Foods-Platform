import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"

/**
 * Shared listing skeleton for /store, /categories/* and /collections/* — a
 * refinement column plus the product grid. Rendered by each route's loading.tsx
 * so navigation paints instantly instead of blocking on the product fetch.
 */
const SkeletonStoreListing = () => {
  return (
    <div className="flex flex-col small:flex-row small:items-start py-6 content-container animate-pulse">
      {/* Refinement column */}
      <div className="small:w-64 small:mr-8 mb-8 small:mb-0 shrink-0">
        <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-3 w-32 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
      <div className="w-full">
        <div className="mb-8">
          <div className="h-8 w-40 bg-gray-200 rounded" />
        </div>
        <SkeletonProductGrid />
      </div>
    </div>
  )
}

export default SkeletonStoreListing
