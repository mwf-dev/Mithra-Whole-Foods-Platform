import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { collectAll } from "../lib/platform-monitor/collector"
import { reportError } from "../lib/observability"

/**
 * Daily infrastructure usage collection.
 *
 * ## Cadence
 *
 * 06:00 UTC, once a day. The original plan said "every 12–24 hours"; once is
 * the right number here. Every metric this collects moves on the scale of days
 * (monthly bandwidth, monthly compute hours, storage), the run-rate maths only
 * needs one reading per day to work, and each run costs ~8 outbound API calls
 * against tokens that are themselves rate limited. Polling harder would add
 * cost and vendor-throttling risk to buy resolution nobody reads.
 *
 * Operational alerting — "is the site down right now" — is deliberately *not*
 * this job's responsibility. That belongs to an uptime probe with a
 * minute-scale interval; use the `/admin/platform/health` route for it.
 *
 * ## Worker mode
 *
 * On Railway with a split deployment, `MEDUSA_WORKER_MODE=server` instances
 * must not run this — Medusa already excludes scheduled jobs from `server`
 * mode, so no guard is needed here, but keep that in mind if the mode ever
 * changes: two instances collecting would double-write snapshots for the same
 * day.
 *
 * ## Failure policy
 *
 * `collectAll` never throws for a single provider failing, so anything caught
 * here is a genuine defect (database down, module missing). It is reported and
 * swallowed: a scheduled job that throws gets retried by the workflow engine,
 * and retrying a fan-out to eight vendor APIs is exactly what should not happen.
 */
export default async function collectPlatformUsage(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const outcome = await collectAll(container, { notify: true })

    const failed = outcome.results.filter((r) => r.status === "error")
    if (failed.length) {
      logger.warn(
        `[platform-monitor] ${failed.length} provider(s) failed: ` +
          failed.map((f) => `${f.provider} (${f.detail})`).join("; ")
      )
    }
  } catch (e: any) {
    reportError(e, { scope: "job.collect-platform-usage" })
    logger.error(`[platform-monitor] collection job failed: ${e?.message}`)
  }
}

export const config = {
  name: "collect-platform-usage",
  schedule: "0 6 * * *",
}
