import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { checkStudioToken } from "../../lib/content-studio"

/**
 * Every Content Studio JSON route starts here. Returns false and has already
 * written the response when access is refused, so callers can early-return.
 */
export function guard(req: MedusaRequest, res: MedusaResponse): boolean {
  const supplied =
    (typeof req.query.t === "string" ? req.query.t : undefined) ??
    (req.headers["x-studio-token"] as string | undefined)

  const check = checkStudioToken(supplied)
  if (!check.ok) {
    // Studio pages are private by link. Keep them out of every index and cache.
    res.setHeader("X-Robots-Tag", "noindex, nofollow")
    res.status(check.status).json({ message: check.message })
    return false
  }
  return true
}

export function noStore(res: MedusaResponse): void {
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("X-Robots-Tag", "noindex, nofollow")
}
