"use server"

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Locale = {
  code: string
  name: string
}

/**
 * How long a "this backend has no /store/locales" answer is trusted before we
 * probe again. Long enough that the 404 stops costing a round trip per render,
 * short enough that adding the route to the backend takes effect on its own.
 */
const UNSUPPORTED_TTL_MS = 60 * 60 * 1000

/**
 * `force-cache` does not help here: Next's Data Cache only stores successful
 * responses, so a 404 is re-requested on *every* render. `/store/locales` is a
 * Medusa Cloud route that this self-hosted backend does not serve, which made
 * it a guaranteed failed round trip per page view — measured at 450–1,300 ms,
 * spent against the shared 150 req/min `/store/*` budget. Remembering the
 * negative answer in-process is what actually removes the cost.
 */
let unsupportedUntil = 0

/**
 * Fetches available locales from the backend.
 * Returns null if the endpoint returns 404 (locales not configured).
 */
export const listLocales = async (): Promise<Locale[] | null> => {
  if (Date.now() < unsupportedUntil) {
    return null
  }

  const next = {
    ...(await getCacheOptions("locales")),
  }

  return sdk.client
    .fetch<{ locales: Locale[] }>(`/store/locales`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    .then(({ locales }) => {
      unsupportedUntil = 0
      return locales
    })
    .catch(() => {
      unsupportedUntil = Date.now() + UNSUPPORTED_TTL_MS
      return null
    })
}
