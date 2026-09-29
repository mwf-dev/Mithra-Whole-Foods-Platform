import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PLATFORM_MONITOR_MODULE } from "../../../../../modules/platform-monitor"
import { clearCredentials } from "../../../../../lib/platform-monitor/connections"
import { getProvider } from "../../../../../lib/platform-monitor/providers"

/**
 * DELETE /admin/platform/connections/:provider
 *
 * Removes stored credentials and settings for one platform. Builtin providers
 * (the storefront probe, this backend) have no stored credentials to remove and
 * cannot be deleted — they are always part of the dashboard.
 *
 * `?credentials_only=true` wipes the token but keeps the project ids and the
 * collected history, which is the normal move when rotating a leaked key.
 * Without it the whole row goes, and the provider falls back to env vars if
 * any are set. Usage history is *never* deleted here: the snapshots outlive the
 * credential, and losing a year of trend data to a key rotation would be a
 * nasty surprise.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const providerId = req.params.provider
  const provider = getProvider(providerId)

  if (!provider) {
    res.status(404).json({ message: `Unknown provider "${providerId}"` })
    return
  }

  if (provider.builtin) {
    res.status(400).json({
      message: `${provider.label} is built in and cannot be removed`,
    })
    return
  }

  if (req.query.credentials_only === "true") {
    await clearCredentials(req.scope, providerId)
    res.json({ provider: providerId, cleared: "credentials" })
    return
  }

  const svc = req.scope.resolve(PLATFORM_MONITOR_MODULE)
  const rows = await svc.listPlatformConnections({ provider: providerId })

  if (rows.length) {
    await svc.deletePlatformConnections(rows.map((r: any) => r.id))
  }

  res.json({ provider: providerId, cleared: "connection" })
}
