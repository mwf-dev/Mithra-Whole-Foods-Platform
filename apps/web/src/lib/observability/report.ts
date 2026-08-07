import * as Sentry from "@sentry/nextjs"

/**
 * One way to report a problem, usable from server components, server actions,
 * client components and route handlers alike.
 *
 * This exists because of a specific failure mode documented in
 * `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §8: several `lib/data/*` helpers
 * catch backend failures and return `null`/`[]`, so an outage renders a
 * structurally valid, completely **empty store** — no error boundary, no
 * alert, no log. The first sign of trouble is a customer email.
 *
 * The fix is not "stop catching" everywhere (an empty category page is better
 * than a 500 for the shopper). The fix is that catching must always be
 * *reported*. `reportError` is the thing you call in the `catch` before you
 * return the fallback.
 *
 * Inert without `NEXT_PUBLIC_SENTRY_DSN`, apart from the console line — which
 * is itself the point: even with no vendor configured, failures stop being
 * silent.
 */

export type ErrorContext = {
  /** Where this happened, e.g. "lib/data/products.listProducts". */
  scope: string
  /** Anything that helps reproduce it. Must not contain PII. */
  extra?: Record<string, unknown>
  /**
   * `warning` for a handled degradation (empty fallback returned),
   * `error` for something that broke the page.
   */
  level?: "warning" | "error"
}

/** Extracts an HTTP status from a Medusa SDK / fetch error, if there is one. */
export function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) {
    return null
  }

  const e = error as Record<string, any>
  const status = e.status ?? e.statusCode ?? e.response?.status

  return typeof status === "number" ? status : null
}

export function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  return "Unknown error"
}

/**
 * Report a caught error. Never throws — a reporting failure must not become
 * the error the shopper sees.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  const status = statusOf(error)
  const level = context.level ?? "error"

  try {
    // Always log, vendor or not. This is what turns a silent empty store into
    // something greppable in Railway/Vercel logs.
    const line = `[${context.scope}] ${messageOf(error)}${
      status ? ` (status ${status})` : ""
    }`

    if (level === "warning") {
      console.warn(line, context.extra ?? "")
    } else {
      console.error(line, context.extra ?? "")
    }

    Sentry.captureException(error, {
      level,
      tags: {
        scope: context.scope,
        ...(status ? { http_status: String(status) } : {}),
        // Rate-limit trips are the single most likely production failure here
        // (see the audit's request-budget maths) and deserve their own filter.
        ...(status === 429 ? { rate_limited: "true" } : {}),
      },
      extra: context.extra,
    })
  } catch {
    // Reporting itself failed. Nothing sensible left to do.
  }
}

/**
 * A `.catch()` handler that reports the failure and then yields a fallback.
 *
 * Turns the repeated `listCategories().catch(() => [])` — which is how a
 * backend outage becomes an invisible empty page — into
 * `listCategories().catch(swallow([], "nav.listCategories"))`, which degrades
 * exactly the same way for the shopper but is loud in the logs.
 *
 * Defaults to `warning`: reaching one of these means the page still rendered.
 */
export function swallow<T>(
  fallback: T,
  scope: string,
  extra?: Record<string, unknown>
): (error: unknown) => T {
  return (error: unknown) => {
    reportError(error, { scope, level: "warning", extra })
    return fallback
  }
}

/**
 * Report a noteworthy non-exception condition (e.g. "search returned zero
 * results for a query that should match").
 */
export function reportMessage(
  message: string,
  context: ErrorContext
): void {
  try {
    console.warn(`[${context.scope}] ${message}`, context.extra ?? "")
    Sentry.captureMessage(message, {
      level: context.level ?? "warning",
      tags: { scope: context.scope },
      extra: context.extra,
    })
  } catch {
    // ignore
  }
}
