import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PLATFORM_MONITOR_MODULE } from "../../../../modules/platform-monitor"

/**
 * GET /admin/platform/snapshots?provider=neon&limit=90
 *
 * Raw history for one provider — what the trend chart on the provider detail
 * screen plots. Separate from the overview route because history is the one
 * part of this API whose payload scales with time (`limit` caps it, default 90
 * days ≈ 90 rows).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const provider = String(req.query.provider ?? "")
  if (!provider) {
    res.status(400).json({ message: "?provider= is required" })
    return
  }

  const limit = Math.min(Number(req.query.limit) || 90, 400)
  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)

  const snapshots = await svc.listUsageSnapshots(
    { provider },
    { order: { captured_at: "DESC" }, take: limit }
  )

  res.json({ provider, snapshots })
}
