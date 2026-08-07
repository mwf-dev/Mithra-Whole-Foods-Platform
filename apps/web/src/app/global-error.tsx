"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

// Last-resort boundary: replaces the root layout when it crashes, so this
// must render a complete HTML document with no app dependencies.
//
// Reports via the Sentry SDK directly rather than through
// `@lib/observability/report` — if the root layout is broken, the fewer of our
// own modules this file depends on, the better its odds of running at all.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error boundary:", error)
    Sentry.captureException(error, {
      level: "fatal",
      tags: { scope: "boundary.global" },
      extra: { digest: error.digest },
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
          padding: "1rem",
          textAlign: "center",
          color: "#111827",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Something went wrong
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
          Please try again in a moment.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            color: "#fff",
            background: "#15803d",
            border: "none",
            borderRadius: "9999px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
