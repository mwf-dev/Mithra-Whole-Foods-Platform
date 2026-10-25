import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OPS_LOG_MODULE } from "../../../modules/ops-log"

/**
 * GET /admin/ops-log — newest operations (emails, Easyship webhooks, labels).
 * Optional filters: ?kind=email|webhook|label  ?status=ok|failed
 *                    ?order_id=…   ?limit=<1..200, default 100>
 *
 * Read-only; replaying a failed row lives in POST /admin/ops-log/:id/retry.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(OPS_LOG_MODULE) as any

  const kind = String(req.query.kind ?? "").trim()
  const status = String(req.query.status ?? "").trim()
  const orderId = String(req.query.order_id ?? "").trim()
  const limitRaw = Number(req.query.limit ?? 100)
  const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? Math.floor(limitRaw) : 100, 1), 200)

  const filters: Record<string, unknown> = {}
  if (["email", "webhook", "label"].includes(kind)) filters.kind = kind
  if (["ok", "failed"].includes(status)) filters.status = status
  if (orderId) filters.order_id = orderId

  const [events, count] = await svc.listAndCountOpsLogEvents(filters, {
    take: limit,
    order: { created_at: "DESC" },
  })

  res.json({ events, count })
}
