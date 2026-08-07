import { ipKeyGenerator } from "express-rate-limit"

type RateLimitedRequest = {
  headers: Record<string, unknown>
  ip?: string
}

// Railway's edge proxy APPENDS the real client IP to X-Forwarded-For, so the
// rightmost entry is the only one we can trust — the leftmost entries are
// client-supplied and spoofable. ipKeyGenerator buckets IPv6 clients by /56
// so one subscriber can't dodge limits by rotating within their prefix.
export const clientIpKey = (req: RateLimitedRequest): string => {
  const forwarded = req.headers["x-forwarded-for"]
  const ip =
    typeof forwarded === "string" && forwarded.length > 0
      ? forwarded.split(",").pop()!.trim()
      : req.ip ?? ""
  return ipKeyGenerator(ip)
}

const PROXY_SECRET = process.env.STOREFRONT_PROXY_SECRET

/** Constant-time compare, so the secret can't be recovered by timing. */
const secretMatches = (candidate: unknown): boolean => {
  if (!PROXY_SECRET || typeof candidate !== "string") {
    return false
  }

  if (candidate.length !== PROXY_SECRET.length) {
    return false
  }

  let mismatch = 0
  for (let i = 0; i < candidate.length; i++) {
    mismatch |= candidate.charCodeAt(i) ^ PROXY_SECRET.charCodeAt(i)
  }

  return mismatch === 0
}

/**
 * Rate-limit key for `/store/*`.
 *
 * `clientIpKey` alone is structurally wrong for this app: the storefront is
 * server-rendered, so **every shopper's request arrives from the same IP** (the
 * Next server's). Keying on that turns a per-abuser limit into a site-wide
 * ceiling that normal traffic exhausts — see
 * `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §1.
 *
 * The storefront therefore forwards the real shopper IP, authenticated with a
 * shared secret. Honouring an arbitrary client-supplied header would be a
 * trivial bypass of the limiter, so the header is used **only** when the secret
 * matches — anything else falls straight back to IP keying.
 *
 * With `STOREFRONT_PROXY_SECRET` unset (the current state), this is exactly the
 * old behaviour, so deploy order does not matter.
 */
export const storeRateLimitKey = (req: RateLimitedRequest): string => {
  if (PROXY_SECRET && secretMatches(req.headers["x-mithra-proxy-secret"])) {
    const forwardedShopperIp = req.headers["x-mithra-client-ip"]

    if (
      typeof forwardedShopperIp === "string" &&
      forwardedShopperIp.length > 0
    ) {
      // Prefixed so a shopper bucket can never collide with a raw-IP bucket.
      return `shopper:${ipKeyGenerator(forwardedShopperIp)}`
    }
  }

  return clientIpKey(req)
}
