"use client"

import { reportError } from "@lib/observability/report"
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
    // `digest` is the only handle on the corresponding server-side error, so it
    // has to travel with the report or the two can't be matched up.
    reportError(error, {
      scope: "boundary.main",
      extra: { digest: error.digest },
    })
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
