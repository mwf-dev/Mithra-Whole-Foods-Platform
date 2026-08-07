"use client"

import { reportError } from "@lib/observability/report"
import Link from "next/link"
import { useEffect } from "react"

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Highest-severity boundary in the app: whatever landed here cost a sale.
    reportError(error, {
      scope: "boundary.checkout",
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
        Checkout hit a problem
      </h1>
      <p className="text-gray-500 mb-2 max-w-md">
        Don&apos;t worry — your cart is saved. Please try again.
      </p>
      <p className="text-gray-400 text-sm mb-8 max-w-md">
        If the problem continues, your items will still be in the cart when
        you come back.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-green-700 hover:bg-green-800 rounded-full transition-colors"
        >
          Try again
        </button>
        <Link
          href="/cart"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          Back to cart
        </Link>
      </div>
    </div>
  )
}
