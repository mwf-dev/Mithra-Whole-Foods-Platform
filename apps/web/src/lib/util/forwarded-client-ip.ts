import "server-only"
import { headers as nextHeaders } from "next/headers"

/**
 * Forwards the *shopper's* IP to Medusa so the store rate limiter can bucket
 * per shopper instead of per storefront.
 *
 * ## The problem this solves
 *
 * `apps/backend/src/api/middlewares.ts` limits `/store/*` to 150 req/min keyed
 * by client IP. But the storefront renders on the server, so every shopper's
 * request reaches Medusa from **one** IP — the Next server's. The limit is
 * therefore a site-wide ceiling shared by all shoppers at once, not a
 * per-abuser control. A handful of people browsing normally can exhaust it and
 * everyone gets 429s. (Documented in `docs/AUDIT_2026-08-01_FRONTEND_PERF.md`
 * §1.)
 *
 * ## Why a shared secret
 *
 * The obvious fix — "trust `x-forwarded-for`" — is worse than the bug: any
 * client could then spoof a header and get an unlimited private bucket, which
 * is exactly what the limiter exists to prevent. So the forwarded IP is only
 * honoured when accompanied by `STOREFRONT_PROXY_SECRET`, which proves the
 * request came from our own server. Without the secret configured on both
 * sides, the backend ignores the header entirely and falls back to the old
 * IP-keyed behaviour — so this is safe to deploy in either order.
 */

const PROXY_SECRET = process.env.STOREFRONT_PROXY_SECRET

export type ForwardedIdentityHeaders = {
  "x-mithra-proxy-secret"?: string
  "x-mithra-client-ip"?: string
}

/**
 * Best-effort. Returns `{}` outside a request scope (build-time rendering,
 * scripts) or when no secret is configured — callers must treat this as
 * optional decoration, never as something to depend on.
 */
export async function getForwardedIdentityHeaders(): Promise<ForwardedIdentityHeaders> {
  if (!PROXY_SECRET) {
    return {}
  }

  try {
    const h = await nextHeaders()

    // Vercel's own header is the most trustworthy when present; it is set by
    // the platform edge and cannot be spoofed by the client.
    const vercelIp = h.get("x-vercel-forwarded-for")
    const forwarded = h.get("x-forwarded-for")
    const realIp = h.get("x-real-ip")

    // Leftmost entry of x-forwarded-for is the original client. On Vercel the
    // chain is written by the platform, so this is trustworthy here — which is
    // the opposite of the backend's situation, where Railway *appends* and only
    // the rightmost entry can be trusted. Hence the two different rules.
    const clientIp =
      vercelIp ?? forwarded?.split(",")[0]?.trim() ?? realIp ?? null

    if (!clientIp) {
      return {}
    }

    return {
      "x-mithra-proxy-secret": PROXY_SECRET,
      "x-mithra-client-ip": clientIp,
    }
  } catch {
    // No request scope. Fine — the backend falls back to IP keying.
    return {}
  }
}
