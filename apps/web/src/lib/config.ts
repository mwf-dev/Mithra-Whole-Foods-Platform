import { getForwardedIdentityHeaders } from "@lib/util/forwarded-client-ip"
import { getLocaleHeader } from "@lib/util/get-locale-header"
import { withResilience } from "@lib/util/resilient-fetch"
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk"

// Defaults to standard port for Medusa server
let MEDUSA_BACKEND_URL = "http://localhost:9000"

if (process.env.MEDUSA_BACKEND_URL) {
  MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL
}

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const originalFetch = sdk.client.fetch.bind(sdk.client)

/**
 * Every backend call the storefront makes funnels through here, so this is the
 * one place that can make transient backend trouble survivable. Two things are
 * layered on top of the SDK's fetch:
 *
 *  1. the locale header (pre-existing behaviour), and
 *  2. a retry + timeout policy — see `@lib/util/resilient-fetch`, which is
 *     careful to replay reads but not writes.
 *
 * The `AbortSignal` is threaded into `init` so the timeout can actually cancel
 * an in-flight request rather than just abandoning the promise.
 */
sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {}
  let localeHeader: Record<string, string | null> | undefined
  try {
    localeHeader = await getLocaleHeader()
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"]
  } catch {}

  // Lets the backend rate-limit per shopper rather than per storefront.
  // Silently absent unless STOREFRONT_PROXY_SECRET is set on both sides.
  const identityHeaders = await getForwardedIdentityHeaders()

  const newHeaders = {
    ...localeHeader,
    ...identityHeaders,
    ...headers,
  }

  const method = init?.method ?? "GET"

  return withResilience<T>(
    (signal) =>
      originalFetch(
        input,
        {
          ...init,
          headers: newHeaders,
          // Caller-supplied signals win — a component that wants to cancel
          // early must not be overridden by the retry policy's timeout.
          signal: init?.signal ?? signal,
        } as FetchArgs
      ),
    {
      method,
      scope: `medusa.${method.toLowerCase()} ${
        typeof input === "string" ? input : "request"
      }`,
    }
  )
}
