import { PostHog } from "posthog-node"

import { reportError } from "./observability"

/**
 * Backend analytics — the authoritative revenue sink.
 *
 * The storefront also reports `order_completed` from the confirmation page, but
 * that event depends on the shopper's browser cooperating: ad blockers, privacy
 * settings and a closed tab all drop it, and industry estimates put that loss
 * at 20–40% of journeys. Revenue reporting cannot be built on that. This module
 * emits from the `order.placed` subscriber instead, where the order is already
 * committed to the database.
 *
 * Both events carry the same `order_id`, so **deduplicate on it** when
 * building revenue reports — otherwise every order that completes normally is
 * counted twice.
 *
 * Inert without `POSTHOG_KEY`.
 */

const POSTHOG_KEY = process.env.POSTHOG_KEY
const POSTHOG_HOST = process.env.POSTHOG_HOST || "https://us.i.posthog.com"

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) {
    return null
  }

  if (!client) {
    try {
      client = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        flushAt: 1,
        flushInterval: 0,
      })
    } catch (e) {
      reportError(e, { scope: "analytics.init", level: "warning" })
      return null
    }
  }

  return client
}

export type ServerOrderCompleted = {
  order_id: string
  order_number?: string | null
  /** Medusa's `query.graph` types this loosely; accept whatever it hands back. */
  display_id?: string | number | null
  total: number
  subtotal?: number | null
  shipping_total?: number | null
  currency: string
  item_count: number
  /** Product handles/titles — no customer PII. */
  items: { title: string; quantity: number }[]
  shipping_option?: string | null
  /** Coarse location only — used to size the Exton local-delivery zone. */
  postal_code?: string | null
}

/**
 * Emit the authoritative purchase event.
 *
 * `distinctId` should be the customer id so this stitches to the browser-side
 * funnel that `AnalyticsIdentify` established. Falls back to the order id,
 * which still gives correct revenue totals — just not a joined user journey.
 *
 * Never throws: an analytics failure must never affect order placement.
 */
export async function trackOrderCompleted(
  distinctId: string,
  properties: ServerOrderCompleted
): Promise<void> {
  const ph = getClient()

  if (!ph) {
    return
  }

  try {
    ph.capture({
      distinctId,
      event: "order_completed",
      properties: { ...properties, source: "server" },
    })
    await ph.flush()
  } catch (e) {
    reportError(e, {
      scope: "analytics.trackOrderCompleted",
      level: "warning",
      extra: { orderId: properties.order_id },
    })
  }
}

/** Flush and close. Call from a graceful-shutdown hook if one is added. */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) {
    return
  }

  try {
    await client.shutdown()
  } catch {
    // ignore
  }
}
