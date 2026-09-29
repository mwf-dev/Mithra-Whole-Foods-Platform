import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { collectAll } from "../../../../lib/platform-monitor/collector"
import { PROVIDER_IDS } from "../../../../lib/platform-monitor/providers"

/**
 * POST /admin/platform/collect — run the usage collector now.
 *
 * The "Refresh now" button, and what the scheduled job calls. Optionally
 * scoped to specific providers (`{ "providers": ["neon"] }`) so re-testing one
 * platform after fixing its token doesn't re-hit the other seven and doesn't
 * re-send a Slack digest for alerts that already went out.
 *
 * Synchronous: a full run is ~8 sequential-per-provider HTTP calls capped at
 * 12s each, so worst case is under a minute even with several providers
 * timing out. Acceptable for an operator-triggered button; if this ever moves
 * onto a page's render path it should become a workflow instead.
 */

const schema = z.object({
  providers: z.array(z.enum(PROVIDER_IDS as [string, ...string[]])).optional(),
  notify: z.boolean().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = schema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" })
    return
  }

  const outcome = await collectAll(req.scope, {
    providerIds: parsed.data.providers,
    notify: parsed.data.notify,
  })

  res.json(outcome)
}
