import * as Sentry from "@sentry/node"

/**
 * Backend error reporting.
 *
 * Initialised lazily on first use rather than at module load: Medusa loads this
 * file in several process roles (server, worker, CLI scripts, migrations), and
 * a top-level `Sentry.init()` would fire in all of them — including one-off
 * `medusa exec` scripts where it is pure noise.
 *
 * Inert without `SENTRY_DSN`, apart from the console line. That console line is
 * the point: even unconfigured, failures stop being silent.
 */

let initialised = false

const DSN = process.env.SENTRY_DSN

function ensureInit(): void {
  if (initialised || !DSN) {
    return
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: process.env.NODE_ENV || "development",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
      sendDefaultPii: false,
    })
    initialised = true
  } catch (e) {
    console.warn("[observability] Sentry init failed", e)
  }
}

export type BackendErrorContext = {
  /** Where this happened, e.g. "subscriber.order-placed". */
  scope: string
  /** Must not contain PII — no emails, no addresses. */
  extra?: Record<string, unknown>
  level?: "warning" | "error"
}

/**
 * Report a caught backend error. Never throws.
 *
 * Use this in the `catch` of anything that deliberately swallows a failure to
 * avoid breaking a commerce flow — order emails, cache revalidation, analytics.
 * Swallowing is often correct; swallowing *silently* never is.
 */
export function reportError(
  error: unknown,
  context: BackendErrorContext
): void {
  ensureInit()

  const level = context.level ?? "error"
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error")

  try {
    const line = `[${context.scope}] ${message}`
    if (level === "warning") {
      console.warn(line, context.extra ?? "")
    } else {
      console.error(line, context.extra ?? "")
    }

    if (initialised) {
      Sentry.captureException(error, {
        level,
        tags: { scope: context.scope },
        extra: context.extra,
      })
    }
  } catch {
    // Reporting failed. Nothing sensible left to do.
  }
}
