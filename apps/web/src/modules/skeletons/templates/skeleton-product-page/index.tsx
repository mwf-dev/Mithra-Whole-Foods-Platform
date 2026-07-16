import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"

/**
 * Full-page skeleton for the PDP. Mirrors the real ProductTemplate layout
 * (breadcrumb bar → white card with image left + details right → related grid)
 * so that when `next/link` navigates to a product, a meaningful shell paints
 * instantly instead of the click blocking on the backend product fetch.
 */
const SkeletonProductPage = () => {
  return (
    <div className="bg-[#FAFAFA] min-h-screen animate-pulse">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-2">
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-3 w-3 bg-gray-100 rounded" />
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-3 w-3 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-white rounded-2xl p-6 md:p-12 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-12">
          {/* Image */}
          <div className="w-full md:w-1/2">
            <div className="aspect-[4/5] bg-gray-100 rounded-xl" />
            <div className="mt-4 flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-16 bg-gray-100 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="h-9 w-3/4 bg-gray-200 rounded mb-4" />
            <div className="h-6 w-24 bg-gray-100 rounded mb-4" />
            <div className="h-8 w-32 bg-gray-200 rounded mb-8" />
            <div className="space-y-3 mb-8">
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
            </div>
            <div className="h-px bg-gray-100 w-full mb-6" />
            <div className="h-12 w-full bg-gray-200 rounded-lg mb-4" />
            <div className="h-12 w-full bg-gray-100 rounded-lg mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 bg-gray-50 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20">
          <SkeletonRelatedProducts />
        </div>
      </div>
    </div>
  )
}

export default SkeletonProductPage
