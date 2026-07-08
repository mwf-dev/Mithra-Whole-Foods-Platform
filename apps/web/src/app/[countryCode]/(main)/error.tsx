"use client"

import Link from "next/link"
import { useEffect } from "react"

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Storefront error boundary:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        Something went wrong
      </h1>
      <p className="text-gray-500 mb-8 max-w-md">
        We couldn&apos;t load this page. It may be a temporary problem — please
        try again.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-full transition-colors"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  )
}
