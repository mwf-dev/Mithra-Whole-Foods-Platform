import { ipKeyGenerator } from "express-rate-limit"

// Railway's edge proxy APPENDS the real client IP to X-Forwarded-For, so the
// rightmost entry is the only one we can trust — the leftmost entries are
// client-supplied and spoofable. ipKeyGenerator buckets IPv6 clients by /56
// so one subscriber can't dodge limits by rotating within their prefix.
export const clientIpKey = (req: {
  headers: Record<string, unknown>
  ip?: string
}): string => {
  const forwarded = req.headers["x-forwarded-for"]
  const ip =
    typeof forwarded === "string" && forwarded.length > 0
      ? forwarded.split(",").pop()!.trim()
      : req.ip ?? ""
  return ipKeyGenerator(ip)
}
