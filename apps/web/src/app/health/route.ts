import { NextResponse } from "next/server"

/**
 * Uptime + readiness probe for the storefront.
 *
 * Deliberately *deep*: it checks that the storefront can reach Medusa and get a
 * usable region back. A shallow "is Next alive" check would keep reporting 200
 * during the exact failure this app is most prone to — the backend rate
 * limiting or refusing the storefront while Next happily serves an empty shop
 * (see `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §8).
 *
 * Status codes:
 *   200 — storefront and backend both healthy
 *   503 — backend unreachable, erroring, or returning no regions
 *
 * Point an uptime monitor at this, not at `/`.
 */

export const dynamic = "force-dynamic"
export const revalidate = 0

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

/** Short — a probe must fail fast, not hang until the monitor times out. */
const PROBE_TIMEOUT_MS = 5_000

export async function GET() {
  const startedAt = Date.now()

  const base = {
    service: "storefront",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown",
    // Self-reported config. Without this, a misconfigured MEDUSA_BACKEND_URL is
    // indistinguishable from a dead backend from outside — both surface as a
    // bare 404 and the middleware turns it into an opaque
    // MIDDLEWARE_INVOCATION_FAILED. The backend host is public (it is in every
    // browser's network tab), and the key is reported as prefix + length only,
    // never in full.
    config: {
      backend_url: BACKEND_URL ?? null,
      // A trailing slash produces `//store/regions`, which 404s. It is the
      // single most common way this variable is set wrong.
      backend_url_has_trailing_slash: BACKEND_URL?.endsWith("/") ?? null,
      publishable_key: PUBLISHABLE_KEY
        ? `${PUBLISHABLE_KEY.slice(0, 11)}… (${PUBLISHABLE_KEY.length} chars)`
        : null,
      // Vercel deployment id — proves whether a redeploy actually replaced the
      // build serving this domain, or the alias still points at the old one.
      deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    },
  }

  if (!BACKEND_URL) {
    return NextResponse.json(
      { ...base, status: "unhealthy", reason: "MEDUSA_BACKEND_URL is not set" },
      { status: 503 }
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const res = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: PUBLISHABLE_KEY
        ? { "x-publishable-api-key": PUBLISHABLE_KEY }
        : {},
      signal: controller.signal,
      // Must never be served from cache — a cached 200 would hide an outage.
      cache: "no-store",
    })

    const latencyMs = Date.now() - startedAt

    if (!res.ok) {
      // The body fingerprints *which* 404 this is, and they need opposite
      // fixes: Railway's edge answers `{"message":"Application not found"}` for
      // a host that no longer exists, whereas a live Medusa behind a bad path
      // answers Express's `Cannot GET //store/regions`. Truncated — this is a
      // diagnostic, not a log sink.
      const detail = await res
        .text()
        .then((t) => t.slice(0, 200))
        .catch(() => null)

      return NextResponse.json(
        {
          ...base,
          status: "unhealthy",
          reason: `backend returned ${res.status}`,
          // Surfaced explicitly: this is the failure this app is most likely
          // to hit, and it needs to be obvious in a monitor's alert body.
          rate_limited: res.status === 429,
          backend: {
            reachable: true,
            status: res.status,
            latencyMs,
            railway_edge: res.headers.get("x-railway-edge"),
            // Present only when Railway had no app to route to.
            railway_fallback: res.headers.get("x-railway-fallback"),
            detail,
          },
        },
        { status: 503 }
      )
    }

    const body = (await res.json()) as { regions?: unknown[] }
    const regionCount = body.regions?.length ?? 0

    if (regionCount === 0) {
      return NextResponse.json(
        {
          ...base,
          status: "unhealthy",
          reason: "backend returned no regions — storefront cannot render",
          backend: { reachable: true, status: res.status, latencyMs },
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      ...base,
      status: "healthy",
      backend: { reachable: true, status: res.status, latencyMs, regionCount },
    })
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError"

    return NextResponse.json(
      {
        ...base,
        status: "unhealthy",
        reason: aborted
          ? `backend did not respond within ${PROBE_TIMEOUT_MS}ms`
          : "backend unreachable",
        // A malformed MEDUSA_BACKEND_URL (missing scheme, stray whitespace)
        // never gets as far as a status code — it throws here, and the message
        // is the only thing that names the cause.
        detail: error instanceof Error ? error.message : String(error),
        backend: { reachable: false, latencyMs: Date.now() - startedAt },
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timer)
  }
}
