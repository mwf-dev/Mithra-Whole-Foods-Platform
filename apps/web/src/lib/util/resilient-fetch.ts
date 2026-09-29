import { reportError, statusOf } from "@lib/observability/report"

/**
 * Retry/timeout policy for every call the storefront makes to Medusa.
 *
 * Why this exists: `/store/*` is rate limited to 150 req/min **keyed by client
 * IP**, and because the storefront is server-rendered every shopper shares the
 * Next server's IP. That makes 429 a *site-wide* condition that arrives in
 * bursts rather than a per-user one (see
 * `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §1). Before this wrapper, a single
 * burst turned into blank product grids for everyone who happened to be
 * browsing. One short, jittered retry converts most of those into a slightly
 * slower page instead of a broken one.
 *
 * ## What gets retried, and what deliberately does not
 *
 * | Failure | GET / HEAD | POST / PUT / DELETE |
 * |---|---|---|
 * | 429 rate limited | retry | **retry** — a 429 is rejected *before* the handler runs, so the write definitively did not happen |
 * | 502/503/504 | retry | no — the write may have landed; retrying could double-charge or double-add |
 * | 500 | no | no — a deterministic server bug won't fix itself in 200 ms |
 * | Network / timeout | retry | no — indistinguishable from "it succeeded and the response was lost" |
 *
 * That asymmetry is the whole point. Blanket-retrying writes is how a shop
 * ends up with duplicate line items and double payment attempts.
 */

export type RetryPolicy = {
  /** Total attempts including the first. */
  maxAttempts: number
  /** Base delay in ms; grows exponentially with full jitter. */
  baseDelayMs: number
  /** Ceiling for a single backoff wait. */
  maxDelayMs: number
  /** Abort any single attempt after this long. */
  timeoutMs: number
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs: 2_000,
  // Generous enough for a cold Railway container, short enough that a hung
  // backend doesn't hold a server render open until the platform kills it.
  timeoutMs: 10_000,
}

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

/** Statuses worth retrying on an idempotent request. */
const TRANSIENT_STATUSES = new Set([429, 502, 503, 504])

function isIdempotent(method?: string): boolean {
  return IDEMPOTENT_METHODS.has((method ?? "GET").toUpperCase())
}

/**
 * Decide whether `error` is worth another attempt.
 * See the table above for the reasoning behind the write-side restriction.
 */
export function isRetryable(error: unknown, method?: string): boolean {
  const status = statusOf(error)
  const idempotent = isIdempotent(method)

  if (status === 429) {
    // Safe for writes too: rate limiting rejects before any state changes.
    return true
  }

  if (status === null) {
    // Network error, DNS failure, or our own timeout. We cannot tell whether a
    // write landed, so only replay reads.
    return idempotent
  }

  return idempotent && TRANSIENT_STATUSES.has(status)
}

/**
 * How long to wait before the next attempt.
 *
 * Honours `Retry-After` when the server sent one — with the IP-keyed limiter
 * upstream, that header is the only reliable signal for when the shared budget
 * refills. Otherwise exponential backoff with **full jitter**: because every
 * shopper's request is proxied through one server IP, they all trip the limit
 * at the same instant, and un-jittered backoff would march them into the next
 * window in lockstep and trip it again.
 */
export function backoffDelay(
  attempt: number,
  policy: RetryPolicy,
  retryAfterHeader?: string | null
): number {
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader)
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1_000, policy.maxDelayMs)
    }
  }

  const exponential = Math.min(
    policy.baseDelayMs * 2 ** (attempt - 1),
    policy.maxDelayMs
  )

  return Math.random() * exponential
}

function retryAfterOf(error: unknown): string | null {
  if (typeof error !== "object" || error === null) {
    return null
  }

  const e = error as Record<string, any>
  const headers = e.response?.headers ?? e.headers

  if (!headers) {
    return null
  }

  if (typeof headers.get === "function") {
    return headers.get("retry-after")
  }

  return headers["retry-after"] ?? null
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Is this failure worth telling someone about?
 *
 * Ordinary 4xx outcomes are not incidents and must not be reported, or the
 * error tracker fills with noise and stops being read. Two happen constantly
 * here by design:
 *
 *  - `GET /store/customers/me` → **401** for every signed-out shopper, on
 *    every page render, because the `(main)` layout always calls
 *    `retrieveCustomer()`.
 *  - `GET /store/carts/:id` → **404** when a cart cookie outlives its cart.
 *
 * Both are handled by their callers. What *is* worth reporting: 5xx (the
 * backend is broken), 429 (the shared rate-limit budget is exhausted — the
 * most likely production failure here), and network/timeout errors.
 */
function isReportable(error: unknown): boolean {
  const status = statusOf(error)

  if (status === null) {
    return true // network failure or our own timeout
  }

  if (status === 429 || status >= 500) {
    return true
  }

  return false
}

/**
 * Run `operation` under the retry + timeout policy.
 *
 * `operation` receives an `AbortSignal` and must pass it through to `fetch`,
 * otherwise the timeout can't actually cancel anything.
 */
export async function withResilience<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  {
    method,
    scope,
    policy = DEFAULT_RETRY_POLICY,
  }: { method?: string; scope: string; policy?: RetryPolicy }
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), policy.timeoutMs)

    try {
      return await operation(controller.signal)
    } catch (error) {
      lastError = error

      const canRetry =
        attempt < policy.maxAttempts && isRetryable(error, method)

      if (!canRetry) {
        // Report once, at the point we give up — a retry that eventually
        // succeeds is not an incident. Expected 4xx outcomes are filtered out
        // entirely so the error tracker stays worth reading.
        if (isReportable(error)) {
          reportError(error, {
            scope,
            level: "warning",
            extra: { method, attempts: attempt },
          })
        }
        throw error
      }

      await sleep(backoffDelay(attempt, policy, retryAfterOf(error)))
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError
}
