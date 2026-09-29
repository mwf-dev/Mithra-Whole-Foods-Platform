import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { PLATFORM_MONITOR_MODULE } from "../../../../modules/platform-monitor"
import { PROVIDER_IDS } from "../../../../lib/platform-monitor/providers"

/**
 * GET  /admin/platform/budgets — every operator-set ceiling.
 * POST /admin/platform/budgets — create or update one, keyed by
 *      (provider, metric_key) — the same pair `run-rate.ts` joins on.
 *
 * A budget exists to override or supply a limit the provider itself doesn't
 * report (most providers), or to set a stricter internal ceiling than the plan
 * limit (Cloudinary reports one, but "warn me at 70% of the free tier" might
 * still be what an operator wants). See `models/platform-budget.ts`.
 */

const schema = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  metric_key: z.string().min(1).max(80),
  limit_value: z.number().positive(),
  threshold_pct: z.number().min(1).max(100).optional(),
  enabled: z.boolean().optional(),
  note: z.string().max(300).optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)
  res.json({ budgets: await svc.listPlatformBudgets({}) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid budget payload",
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    })
    return
  }

  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)
  const { provider, metric_key } = parsed.data
  const existing = await svc.listPlatformBudgets({ provider, metric_key })

  const payload = {
    provider,
    metric_key,
    limit_value: parsed.data.limit_value,
    threshold_pct: parsed.data.threshold_pct ?? 90,
    enabled: parsed.data.enabled ?? true,
    note: parsed.data.note ?? null,
  }

  const budget = existing.length
    ? await svc.updatePlatformBudgets({ id: existing[0].id, ...payload })
    : await svc.createPlatformBudgets(payload)

  res.json({ budget })
}
