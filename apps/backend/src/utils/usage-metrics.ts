import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordRequest, startUsageHeartbeat } from "../lib/request-metrics"

/**
 * Counts every request that reaches the backend, and starts the periodic
 * `[usage]` log heartbeat on first use.
 *
 * Registered globally in `middlewares.ts`. It does no I/O and allocates nothing
 * per request beyond a closure, so it is safe on the hot path — see
 * `src/lib/request-metrics.ts` for why this meter exists at all.
 *
 * The heartbeat is started here rather than at module load because module load
 * also happens in `medusa exec` scripts and migrations, where a 15-minute timer
 * is pure noise. A request arriving proves we are in a serving process.
 */
export function usageMetrics(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): void {
  startUsageHeartbeat()

  const startedAt = Date.now()

  // `finish` fires once the last byte is handed to the socket. `close` covers
  // the client hanging up mid-response — without it, abandoned requests (which
  // still cost CPU) would never be counted.
  let recorded = false
  const finalise = () => {
    if (recorded) return
    recorded = true

    const rawLength = res.getHeader("content-length")
    const bytesOut = typeof rawLength === "string" ? Number(rawLength) || 0 : Number(rawLength) || 0

    recordRequest({
      path: req.path || req.url || "/",
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      bytesOut,
    })
  }

  res.on("finish", finalise)
  res.on("close", finalise)

  next()
}
