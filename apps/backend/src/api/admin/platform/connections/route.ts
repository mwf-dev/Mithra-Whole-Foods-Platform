import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import {
  listConnectionState,
  upsertConnection,
} from "../../../../lib/platform-monitor/connections"
import { PROVIDER_IDS } from "../../../../lib/platform-monitor/providers"

/**
 * GET  /admin/platform/connections — configuration state for every provider.
 * POST /admin/platform/connections — create or update one, keyed by provider.
 *
 * Upsert-by-provider rather than REST-by-id: there is exactly one connection
 * per platform (enforced by a unique index), so making the client track a row
 * id it did not create just adds a failure mode.
 *
 * Credential values enter here and never come back out — the response is
 * rebuilt from `listConnectionState`, which returns masked previews only.
 */

const schema = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  label: z.string().max(120).optional(),
  // Free-form because the valid keys are provider-specific; `upsertConnection`
  // filters to the provider's declared fields, so an unknown key is dropped
  // rather than stored.
  credentials: z.record(z.string(), z.string()).optional(),
  settings: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.json({ connections: await listConnectionState(req.scope) })
}

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = schema.safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid connection payload",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    })
    return
  }

  try {
    const connection = await upsertConnection(req.scope, parsed.data)
    res.json({ connection })
  } catch (e: any) {
    // The expected failure is "no secret configured, cannot encrypt" — a
    // deployment problem the operator can fix, so it gets a 400 with the
    // reason rather than an opaque 500.
    res.status(400).json({ message: e?.message ?? "Could not save the connection" })
  }
}
