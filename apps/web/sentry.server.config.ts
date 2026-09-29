import * as Sentry from "@sentry/nextjs"

/**
 * Server-side Sentry (Node runtime). Loaded from `instrumentation.ts`.
 *
 * Without `NEXT_PUBLIC_SENTRY_DSN` this initialises with no DSN, which the SDK
 * treats as "disabled" — every `captureException` becomes a no-op. That is the
 * state the repo ships in; add the DSN to switch it on.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",

  // Sampled rather than 1.0: this storefront's problem is a shared per-IP
  // request budget, and tracing every request would add load to the thing
  // we're trying to protect.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Local noise stays local.
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  beforeSend(event) {
    // Belt and braces: never let a stray auth header or cookie reach the
    // vendor, even though sendDefaultPii is off.
    if (event.request?.headers) {
      delete event.request.headers["authorization"]
      delete event.request.headers["cookie"]
    }
    return event
  },

  sendDefaultPii: false,
})
