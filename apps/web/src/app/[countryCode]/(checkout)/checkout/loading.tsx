export default function Loading() {
  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12 animate-pulse">
      {/* Form column */}
      <div className="space-y-8">
        {[0, 1, 2, 3].map((section) => (
          <div key={section} className="space-y-4">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
              <div className="h-11 bg-gray-100 rounded" />
              <div className="h-11 bg-gray-100 rounded" />
              <div className="h-11 bg-gray-100 rounded" />
              <div className="h-11 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
        <div className="h-12 w-40 bg-gray-200 rounded-lg" />
      </div>

      {/* Summary column */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded" />
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-16 w-16 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 bg-gray-100 rounded" />
              <div className="h-3 w-1/3 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
        <div className="h-px bg-gray-100 w-full" />
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-16 bg-gray-100 rounded" />
        </div>
        <div className="flex justify-between">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-20 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
