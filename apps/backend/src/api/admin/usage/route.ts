import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getMetrics } from "../../../lib/request-metrics"

/**
 * GET /admin/usage — traffic and resource meter for this backend process.
 *
 * Answers the question the Railway dashboard cannot: *is anything actually
 * calling this backend, and what is it holding while idle?* Railway bills for
 * allocated RAM/CPU per minute of uptime, so a container with zero traffic
 * still costs money — `resources` here is the number that drives the bill and
 * `traffic` is the number that explains whether that spend is buying anything.
 *
 * Under `/admin/*`, so Medusa's admin session/bearer auth applies automatically
 * — the response exposes process internals and must not be public.
 *
 * Counters are per-process and reset on deploy/restart; `process.uptime_human`
 * tells you how far back the numbers reach. For history, read the `[usage]`
 * lines in the platform logs.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.json(getMetrics())
}
