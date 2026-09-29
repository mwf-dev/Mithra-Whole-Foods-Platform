import "server-only"

import { PostHog } from "posthog-node"
import { after } from "next/server"

import type { CommerceEventMap, CommerceEventName } from "./events"

/**
 * Server-side analytics sink.
 *
 * Used for events that must not depend on the browser cooperating — anything
 * an ad blocker, a closed tab or a privacy setting could otherwise swallow.
 *
 * Work is scheduled with `after()`, so nothing here is on the response path.
 * Latency is the presenting complaint on this storefront; instrumentation must
 * never become another source of it.
 *
 * Inert unless `POSTHOG_KEY` is set (note: server-side, *not*
 * `NEXT_PUBLIC_`-prefixed — the same key value works, but keeping it unexposed
 * server-side avoids shipping it where it isn't needed; the client reads
 * `NEXT_PUBLIC_POSTHOG_KEY` separately).
 */

const POSTHOG_KEY = process.env.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST =
  process.env.POSTHOG_HOST ||
  process.env.NEXT_PUBLIC_POSTHOG_HOST ||
  "https://us.i.posthog.com"

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (!POSTHOG_KEY) {
    return null
  }

  if (!client) {
    try {
      client = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        // Small batches: serverless instances are short-lived, so holding
        // events for a large flush window loses them on shutdown.
        flushAt: 1,
        flushInterval: 0,
      })
    } catch (e) {
      console.warn("[analytics/server] client init failed", e)
      return null
    }
  }

  return client
}

/**
 * Report an event from the server. Never throws, never blocks.
 *
 * `distinctId` should be the customer id where known. For guests, pass the
 * cart id — it's stable across the session and lets a guest funnel stitch
 * together without inventing an identifier.
 */
export function trackServer<K extends CommerceEventName>(
  distinctId: string,
  name: K,
  properties: CommerceEventMap[K]
): void {
  const ph = getClient()

  if (!ph || !distinctId) {
    return
  }

  const send = async () => {
    try {
      ph.capture({ distinctId, event: name, properties })
      await ph.flush()
    } catch (e) {
      console.warn(`[analytics/server] failed to capture "${name}"`, e)
    }
  }

  try {
    // Runs after the response is sent.
    after(send)
  } catch {
    // `after()` is only available inside a request scope. Outside one (a
    // script, a test) fall back to firing directly and ignoring the result.
    void send()
  }
}
