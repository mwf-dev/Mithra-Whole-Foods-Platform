import * as Sentry from "@sentry/nextjs"

/**
 * Browser-side Sentry. Next.js loads this automatically before hydration.
 *
 * Session replay is off by default and sampled only on errors — a grocery
 * storefront has no need to record every session, and replay is the most
 * privacy-sensitive thing in the SDK. All text and inputs are masked.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  sendDefaultPii: false,

  // Extension noise and cross-origin script errors we can neither read nor fix.
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
  ],
})

/** Reports slow/failed client-side route transitions. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
