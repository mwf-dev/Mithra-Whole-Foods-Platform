import * as Sentry from "@sentry/nextjs"

/**
 * Edge runtime Sentry — this is what covers `src/middleware.ts`, which runs on
 * every single request and resolves the region map. A failure there takes the
 * whole site down, so it is worth instrumenting even though the file is small.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
})
