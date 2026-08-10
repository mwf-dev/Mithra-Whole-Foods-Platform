import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PLATFORM_MONITOR_MODULE } from "../../../../../modules/platform-monitor"

/**
 * POST /admin/platform/alerts/:id — acknowledge or resolve an alert by hand.
 *
 * Manual resolution exists for the case the collector can't infer itself: an
 * operator raised a budget on the vendor's own dashboard, so the metric will
 * clear on the next run, but they want the noise gone from the list now.
 * Acknowledging stops re-notification without hiding the row, which matters
 * because `evaluateAlerts` will happily reopen it under a fresh timestamp if
 * the underlying condition is still true — acknowledgement is "I've seen this",
 * not "this is fixed".
 */

const schema = z.object({
  action: z.enum(["acknowledge", "resolve"]),
})

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: "action must be 'acknowledge' or 'resolve'" })
    return
  }

  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)
  const now = new Date()

  const patch =
    parsed.data.action === "acknowledge"
      ? { acknowledged_at: now }
      : { resolved_at: now, acknowledged_at: now }

  const alert = await svc.updatePlatformAlerts({ id: req.params.id, ...patch })
  res.json({ alert })
}
