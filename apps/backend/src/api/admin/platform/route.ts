import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { describeProviders, listConnectionState } from "../../../lib/platform-monitor/connections"
import { buildOverview } from "../../../lib/platform-monitor/collector"
import { canEncrypt } from "../../../lib/platform-monitor/crypto"

/**
 * GET /admin/platform — everything the dashboard's first paint needs.
 *
 * One route rather than three (providers + connections + overview) because the
 * admin UI cannot render any of them in isolation, and three round trips to
 * paint one screen is the exact pattern this project has been auditing out of
 * the storefront.
 *
 * Reads only stored snapshots — no vendor API is contacted here, so the page
 * loads in one database query's time regardless of whether Railway is down.
 * Live checks are explicit: POST /admin/platform/collect and
 * GET /admin/platform/health.
 *
 * Under /admin/*, so Medusa's admin auth applies. That matters more than usual:
 * the response describes the entire infrastructure and which parts are
 * misconfigured.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const [connections, overview] = await Promise.all([
    listConnectionState(req.scope),
    buildOverview(req.scope),
  ])

  res.json({
    providers: describeProviders(),
    connections,
    overview,
    capabilities: {
      // Surfaced so the UI can explain *why* the credential form is disabled
      // rather than failing on save.
      can_store_credentials: canEncrypt(),
      slack_configured: Boolean(process.env.PLATFORM_ALERT_SLACK_WEBHOOK),
      email_configured: Boolean(
        process.env.SENDGRID_API_KEY &&
          (process.env.PLATFORM_ALERT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL)
      ),
    },
  })
}
