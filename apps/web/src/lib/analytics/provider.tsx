"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Suspense, useEffect } from "react"

import { identify, initAnalytics, trackPageView } from "./client"

/**
 * Boots browser analytics and reports a pageview on every App Router
 * navigation.
 *
 * PostHog's built-in pageview capture only fires on hard loads, so in an App
 * Router app it would miss every client-side transition — i.e. almost the
 * entire session. We drive it from `usePathname`/`useSearchParams` instead.
 *
 * `useSearchParams` forces a Suspense boundary during static generation, so the
 * subscriber lives in its own component and the exported provider wraps it.
 * Without that split, adding this to the root layout would opt every page into
 * client-side bailout.
 */
function PageViewReporter() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) {
      return
    }

    const query = searchParams?.toString()
    trackPageView(
      `${window.location.origin}${pathname}${query ? `?${query}` : ""}`
    )
  }, [pathname, searchParams])

  return null
}

export default function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics()
  }, [])

  return (
    <Suspense fallback={null}>
      <PageViewReporter />
    </Suspense>
  )
}

/**
 * Stitches the session to a customer id.
 *
 * Split out from the provider because the root layout (which boots analytics)
 * is not async and has no customer, while the `(main)` layout already fetches
 * one. Rendering this there costs no extra backend call.
 *
 * Only the id is sent — never name, email or address. PII belongs in Medusa.
 */
export function AnalyticsIdentify({
  customerId,
}: {
  customerId?: string | null
}) {
  useEffect(() => {
    if (customerId) {
      identify(customerId)
    }
  }, [customerId])

  return null
}
