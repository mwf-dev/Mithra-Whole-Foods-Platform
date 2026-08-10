import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { testConnection } from "../../../../../../lib/platform-monitor/connections"
import { getProvider } from "../../../../../../lib/platform-monitor/providers"

/**
 * POST /admin/platform/connections/:provider/test
 *
 * Live connectivity check for one platform, run on demand from the admin UI
 * right after a token is entered. The result is cached onto the connection row
 * so the dashboard can show it without re-checking on every page load.
 *
 * Always answers 200 with `{ ok: false, detail }` on a failed check rather than
 * a 4xx: "your Neon key is wrong" is a successful diagnosis, and making the
 * client distinguish transport errors from diagnosis results is how a UI ends
 * up showing "request failed" for a perfectly clear "token expired".
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const providerId = req.params.provider

  if (!getProvider(providerId)) {
    res.status(404).json({ message: `Unknown provider "${providerId}"` })
    return
  }

  const result = await testConnection(req.scope, providerId)
  res.json(result)
}
