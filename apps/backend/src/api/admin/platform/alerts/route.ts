import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PLATFORM_MONITOR_MODULE } from "../../../../modules/platform-monitor"

/**
 * GET /admin/platform/alerts?status=open|resolved|all
 *
 * The alert list screen. `overview.alerts` on the main route already carries
 * the open set for the dashboard badge; this route exists for the dedicated
 * alerts page, which needs history too.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const status = String(req.query.status ?? "open")
  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)

  const filter =
    status === "open"
      ? { resolved_at: null }
      : status === "resolved"
        ? { resolved_at: { $ne: null } }
        : {}

  const alerts = await svc.listPlatformAlerts(filter, {
    order: { triggered_at: "DESC" },
    take: 200,
  })

  res.json({ alerts })
}
