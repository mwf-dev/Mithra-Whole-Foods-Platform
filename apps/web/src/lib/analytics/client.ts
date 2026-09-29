"use client"

import posthog from "posthog-js"

import type { CommerceEventMap, CommerceEventName } from "./events"

/**
 * Browser-side analytics sink.
 *
 * Two rules govern everything in this file:
 *
 *  1. **Never throw into the app.** Analytics is the least important code in
 *     the building. A missing key, a blocked script, a malformed payload — all
 *     of it degrades to a no-op. Every public function swallows its own
 *     errors, because an exception here would otherwise surface as a broken
 *     add-to-cart.
 *  2. **Never block.** Nothing here is awaited by product code. PostHog
 *     batches and sends in the background.
 *
 * With `NEXT_PUBLIC_POSTHOG_KEY` unset the whole module is inert — which is
 * the state the repo ships in, so nothing changes until the key is added.
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

let initialised = false

/** True once PostHog is actually running. False forever if no key is set. */
export function isAnalyticsEnabled(): boolean {
  return initialised
}

/**
 * Boot the browser client. Safe to call repeatedly; only the first call does
 * work. Called from {@link AnalyticsProvider}, not from product code.
 */
export function initAnalytics(): void {
  if (initialised || !POSTHOG_KEY || typeof window === "undefined") {
    return
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // We send pageviews ourselves from the App Router, because PostHog's
      // automatic capture misses client-side navigations in RSC apps.
      capture_pageview: false,
      capture_pageleave: true,
      // Cookieless where possible; shoppers who never consent still give us
      // aggregate funnel shape.
      persistence: "localStorage+cookie",
      autocapture: false,
      // Session replay is the reason to choose PostHog here — being able to
      // watch a failed checkout is worth more than any dashboard.
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-private]",
      },
      loaded: () => {
        initialised = true
      },
    })
    initialised = true
  } catch (e) {
    // Blocked by an extension, quota exceeded, etc. Nothing to do but carry on.
    console.warn("[analytics] init failed; continuing without analytics", e)
  }
}

/**
 * Report a commerce event. Fire-and-forget: callers never await this and it
 * never throws.
 */
export function track<K extends CommerceEventName>(
  name: K,
  properties: CommerceEventMap[K]
): void {
  if (!initialised) {
    return
  }

  try {
    posthog.capture(name, properties)
  } catch (e) {
    console.warn(`[analytics] failed to capture "${name}"`, e)
  }
}

/** Record a pageview. Called by {@link AnalyticsProvider} on every navigation. */
export function trackPageView(url: string): void {
  if (!initialised) {
    return
  }

  try {
    posthog.capture("$pageview", { $current_url: url })
  } catch (e) {
    console.warn("[analytics] failed to capture pageview", e)
  }
}

/**
 * Tie the current browser session to a customer.
 *
 * Deliberately does **not** send name or address — PII belongs in Medusa, not
 * in an analytics vendor. The id is enough to stitch a funnel together.
 */
export function identify(customerId: string): void {
  if (!initialised) {
    return
  }

  try {
    posthog.identify(customerId)
  } catch (e) {
    console.warn("[analytics] identify failed", e)
  }
}

/** Drop the identity link on sign-out so a shared device doesn't merge people. */
export function resetIdentity(): void {
  if (!initialised) {
    return
  }

  try {
    posthog.reset()
  } catch (e) {
    console.warn("[analytics] reset failed", e)
  }
}
