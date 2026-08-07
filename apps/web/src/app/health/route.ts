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
      return NextResponse.json(
        {
          ...base,
          status: "unhealthy",
          reason: `backend returned ${res.status}`,
          // Surfaced explicitly: this is the failure this app is most likely
          // to hit, and it needs to be obvious in a monitor's alert body.
          rate_limited: res.status === 429,
          backend: { reachable: true, status: res.status, latencyMs },
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
        backend: { reachable: false, latencyMs: Date.now() - startedAt },
      },
      { status: 503 }
    )
  } finally {
    clearTimeout(timer)
  }
}
