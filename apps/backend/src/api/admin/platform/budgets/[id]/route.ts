import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PLATFORM_MONITOR_MODULE } from "../../../../../modules/platform-monitor"

/** DELETE /admin/platform/budgets/:id — remove a budget override. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)
  await svc.deletePlatformBudgets(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
