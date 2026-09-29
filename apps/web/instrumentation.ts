import * as Sentry from "@sentry/nextjs"

/**
 * Next.js instrumentation hook — runs once per server/edge process before any
 * request is handled.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

/**
 * Catches errors thrown during React Server Component rendering — including
 * the ones that today only reach `console.error` inside an `error.tsx`
 * boundary and are then lost.
 */
export const onRequestError = Sentry.captureRequestError
