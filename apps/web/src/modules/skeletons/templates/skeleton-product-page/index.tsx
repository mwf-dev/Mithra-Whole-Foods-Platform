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
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center gap-2">
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-3 w-3 bg-gray-100 rounded" />
          <div className="h-3 w-12 bg-gray-200 rounded" />
          <div className="h-3 w-3 bg-gray-100 rounded" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>

      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 md:py-10">
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 xl:p-10 border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14">
          {/* Image */}
          <div className="w-full lg:col-span-7 xl:col-span-7">
            <div className="aspect-square bg-gray-100 rounded-xl" />
            <div className="mt-4 flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 w-16 sm:h-20 sm:w-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="w-full lg:col-span-5 xl:col-span-5 flex flex-col">
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
